'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { staffPrivilegedRoles, type AppRole } from '@/lib/app-config';
import { pickNextInLine } from '@/lib/events/registration-utils';
import { calculatePromotionAvailableSpots } from '@/lib/events/admin-utils';

/**
 * Verifies the calling user is authenticated and has a staff+ role.
 * Returns the authenticated user object.
 */
async function requireStaffUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client unavailable');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const role = (user.app_metadata?.role as string) ?? 'participant';
  if (!staffPrivilegedRoles.includes(role as AppRole)) {
    throw new Error('Insufficient permissions');
  }

  return user;
}

/**
 * Returns the admin (service-role) Supabase client, or throws.
 */
function requireAdminClient() {
  const adminClient = createSupabaseAdminClient();
  if (!adminClient) throw new Error('Admin client unavailable');
  return adminClient;
}

/**
 * Syncs mandatory participant registrations for an event.
 * Uses the admin client (service role) to bypass RLS since staff is managing
 * other users' registrations.
 *
 * - New mandatory participants get upserted with is_mandatory=true, status='registered'
 * - Removed mandatory participants get is_mandatory set to false (their registration stays)
 */
async function syncMandatoryParticipants(eventId: string, mandatoryProfileIds: string[]) {
  const adminClient = requireAdminClient();
  const mandatorySet = new Set(mandatoryProfileIds);

  // Fetch existing mandatory registrations for this event
  const { data: existingMandatory } = await adminClient
    .from('event_registrations')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('is_mandatory', true);

  const existingMandatoryIds = new Set((existingMandatory ?? []).map((r) => r.user_id as string));

  // Determine who to add and who to remove
  const toAdd = mandatoryProfileIds.filter((id) => !existingMandatoryIds.has(id));
  const toRemove = [...existingMandatoryIds].filter((id) => !mandatorySet.has(id));

  // Upsert new mandatory participants — always registered status
  for (const profileId of toAdd) {
    await adminClient.from('event_registrations').upsert(
      {
        event_id: eventId,
        user_id: profileId,
        status: 'registered',
        is_mandatory: true,
        registered_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    );
  }

  // Remove mandatory flag from removed participants (keep their registration)
  for (const profileId of toRemove) {
    await adminClient
      .from('event_registrations')
      .update({ is_mandatory: false })
      .match({ event_id: eventId, user_id: profileId });
  }
}

export async function createEvent(formData: FormData) {
  await requireStaffUser();
  const adminClient = requireAdminClient();

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const location = formData.get('location') as string;
  const starts_at = formData.get('starts_at') as string;
  const ends_at = formData.get('ends_at') as string;
  const capacityStr = formData.get('capacity') as string;
  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  const mandatoryParticipantsJson = formData.get('mandatory_participants') as string;
  const mandatoryProfileIds: string[] = mandatoryParticipantsJson
    ? JSON.parse(mandatoryParticipantsJson)
    : [];

  let startsAtIso = starts_at;
  let endsAtIso = ends_at;
  try {
    if (starts_at) startsAtIso = new Date(starts_at).toISOString();
    if (ends_at) endsAtIso = new Date(ends_at).toISOString();
  } catch (e) {
    return { error: 'Invalid date format provided.' };
  }

  const { data: event, error } = await adminClient
    .from('events')
    .insert({
      title,
      slug,
      location,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      capacity,
    })
    .select()
    .single();

  if (error) {
    return { error: `Failed to create event: ${error.message}` };
  }

  // Sync mandatory participants after event creation
  if (mandatoryProfileIds.length > 0) {
    await syncMandatoryParticipants(event.id, mandatoryProfileIds);
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  await requireStaffUser();
  const adminClient = requireAdminClient();

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const location = formData.get('location') as string;
  const starts_at = formData.get('starts_at') as string;
  const ends_at = formData.get('ends_at') as string;
  const capacityStr = formData.get('capacity') as string;
  const newCapacity = capacityStr ? parseInt(capacityStr, 10) : null;
  const mandatoryParticipantsJson = formData.get('mandatory_participants') as string;
  const mandatoryProfileIds: string[] = mandatoryParticipantsJson
    ? JSON.parse(mandatoryParticipantsJson)
    : [];

  let startsAtIso = starts_at;
  let endsAtIso = ends_at;
  try {
    if (starts_at) startsAtIso = new Date(starts_at).toISOString();
    if (ends_at) endsAtIso = new Date(ends_at).toISOString();
  } catch (e) {
    return { error: 'Invalid date format provided.' };
  }

  // Fetch current event to check if capacity is increasing
  const { data: currentEvent } = await adminClient
    .from('events')
    .select('capacity')
    .eq('id', id)
    .single();

  const { error } = await adminClient
    .from('events')
    .update({
      title,
      slug,
      location,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      capacity: newCapacity,
    })
    .eq('id', id);

  if (error) {
    return { error: `Failed to update event: ${error.message}` };
  }

  // Sync mandatory participants
  await syncMandatoryParticipants(id, mandatoryProfileIds);

  // Handle waitlist auto-promotion logic if capacity has increased or became unlimited
  if (
    currentEvent &&
    currentEvent.capacity !== null &&
    (newCapacity === null || newCapacity > currentEvent.capacity)
  ) {
    // Determine how many spots we can fill
    const { count: registeredCount } = await adminClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'registered');

    if (registeredCount !== null && (newCapacity === null || registeredCount < newCapacity)) {
      const { data: waitlistedUsers } = await adminClient
        .from('event_registrations')
        .select('user_id, registered_at')
        .eq('event_id', id)
        .eq('status', 'waitlisted')
        .order('registered_at', { ascending: true });

      if (waitlistedUsers && waitlistedUsers.length > 0) {
        const spotsToFill = calculatePromotionAvailableSpots(
          newCapacity,
          registeredCount ?? 0,
          waitlistedUsers.length
        );

        let p = 0;
        while (p < spotsToFill && p < waitlistedUsers.length) {
          const nextUser = waitlistedUsers[p];
          await adminClient
            .from('event_registrations')
            .update({ status: 'registered' })
            .match({ event_id: id, user_id: nextUser.user_id });
          p++;
        }
      }
    }
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}`);
  revalidatePath('/events');
  revalidatePath(`/events/${slug}`);
  redirect(`/admin/events/${id}`);
}

export async function deleteEvent(id: string) {
  await requireStaffUser();
  const adminClient = requireAdminClient();

  const { error } = await adminClient.from('events').delete().eq('id', id);

  if (error) {
    return { error: `Failed to delete event: ${error.message}` };
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
  redirect('/admin/events');
}
