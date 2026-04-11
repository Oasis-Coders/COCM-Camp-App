/**
 * app/events/actions.ts
 *
 * Server Actions for the Events feature domain.
 * These run exclusively on the server (Next.js App Router 'use server').
 *
 * Actions exported:
 *   - registerForEvent   — registers the signed-in user for an event, respecting capacity limits
 *   - cancelRegistration — cancels a user's registration and auto-promotes the next waitlisted person
 *
 * Both actions resolve the Supabase profile row separately from the auth.users row because
 * the app stores permissions and relationships on `public.profiles`, not on `auth.users` directly.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { determineRegistrationStatus } from '@/lib/events/registration-utils';

/**
 * Registers the currently signed-in user for the given event.
 *
 * Capacity logic:
 *   - If the event has no capacity limit, status is always 'registered'.
 *   - If the event is full (registeredCount >= capacity), status is set to 'waitlisted'.
 *
 * Re-registration:
 *   - Uses an upsert so a previously cancelled user can re-register without a unique
 *     constraint violation. Their registered_at timestamp is also refreshed.
 *
 * Form data:
 *   - The optional `formData` argument accepts the full multi-field registration form
 *     payload (e.g., Chinese name, faith status, T-shirt size, dietary needs).
 *   - It is JSON-serialised and stored in the `notes` column on `event_registrations`.
 *   - Admin views can deserialise this later — see lib/events/registration-utils.ts.
 *
 * @returns { alreadyRegistered: boolean } — true when the user already holds an active spot
 */
export async function registerForEvent(eventId: string, formData?: any) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  // Verify the session is valid before touching the DB
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Resolve the profile ID — foreign keys on event_registrations point to profiles.id,
  // not to auth.users.id directly.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // If the user already has an active registration (registered or waitlisted), bail early.
  // A cancelled registration is treated as "no active spot" and can be overwritten.
  const { data: existingReg } = await supabase
    .from('event_registrations')
    .select('status')
    .match({ event_id: eventId, user_id: profile.id })
    .maybeSingle();

  if (existingReg && (existingReg.status === 'registered' || existingReg.status === 'waitlisted')) {
    return { alreadyRegistered: true };
  }

  // Fetch the event to read its capacity ceiling
  const { data: event } = await supabase
    .from('events')
    .select('capacity')
    .eq('id', eventId)
    .single();

  if (!event) {
    throw new Error('Event not found');
  }

  // Only count registered spots if the event has a capacity limit set.
  // Events with capacity = null are treated as unlimited.
  let registeredCount = null;
  if (event.capacity !== null) {
    const { count } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');
    registeredCount = count;
  }

  // Pure function in lib/events/registration-utils.ts handles the threshold logic
  const newStatus = determineRegistrationStatus(event.capacity, registeredCount);

  // Serialise the entire Jotform-style payload as JSON into the notes column.
  // Consumers (e.g. admin views) use deserializeFormData() to read it back.
  const serializedNotes = formData ? JSON.stringify(formData) : null;

  // An upsert on (event_id, user_id) re-activates cancelled registrations cleanly
  const { error } = await supabase.from('event_registrations').upsert(
    {
      event_id: eventId,
      user_id: profile.id,
      status: newStatus,
      notes: serializedNotes,
      registered_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,user_id' }
  );

  if (error) {
    throw new Error('Failed to register');
  }

  // Invalidate both the listing page and any cached event detail page
  revalidatePath('/events');
  revalidatePath(`/events/${eventId}`);
  return { alreadyRegistered: false };
}

/**
 * Cancels the currently signed-in user's registration for the given event.
 *
 * Waitlist auto-promotion:
 *   - If the cancelled registration held a 'registered' status AND the event has a capacity
 *     limit AND there is now a free spot, the oldest waitlisted person is automatically
 *     promoted to 'registered' (FIFO order by registered_at).
 *   - If the cancelled user was only on the waitlist, no promotion occurs — no spot was freed.
 */
export async function cancelRegistration(eventId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Read the current status before cancelling so we know whether a registered spot was freed
  const { data: currentReg } = await supabase
    .from('event_registrations')
    .select('status')
    .match({ event_id: eventId, user_id: profile.id })
    .single();

  if (!currentReg) {
    throw new Error('Registration not found');
  }

  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .match({ event_id: eventId, user_id: profile.id });

  if (error) {
    throw new Error('Failed to cancel registration');
  }

  // Only attempt promotion if the cancelled user had a confirmed spot (not just waitlisted)
  if (currentReg.status === 'registered') {
    const { data: event } = await supabase
      .from('events')
      .select('capacity')
      .eq('id', eventId)
      .single();

    if (event?.capacity) {
      // Recount active registered spots after the cancellation
      const { count: registeredCount } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (registeredCount !== null && registeredCount < event.capacity) {
        // Promote the earliest waitlisted entry (FIFO)
        const { data: nextInLine } = await supabase
          .from('event_registrations')
          .select('user_id')
          .eq('event_id', eventId)
          .eq('status', 'waitlisted')
          .order('registered_at', { ascending: true })
          .limit(1)
          .single();

        if (nextInLine) {
          await supabase
            .from('event_registrations')
            .update({ status: 'registered' })
            .match({ event_id: eventId, user_id: nextInLine.user_id });
        }
      }
    }
  }

  revalidatePath('/events');
}
