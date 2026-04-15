'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { pickNextInLine } from '@/lib/events/registration-utils';
import { calculatePromotionAvailableSpots } from '@/lib/events/admin-utils';

export async function createEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client unavailable');

  // Validate admin/staff session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const location = formData.get('location') as string;
  const starts_at = formData.get('starts_at') as string;
  const ends_at = formData.get('ends_at') as string;
  const capacityStr = formData.get('capacity') as string;
  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title,
      slug,
      location,
      starts_at,
      ends_at,
      capacity,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client unavailable');

  // Validate admin/staff session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const title = formData.get('title') as string;
  const slug = formData.get('slug') as string;
  const location = formData.get('location') as string;
  const starts_at = formData.get('starts_at') as string;
  const ends_at = formData.get('ends_at') as string;
  const capacityStr = formData.get('capacity') as string;
  const newCapacity = capacityStr ? parseInt(capacityStr, 10) : null;

  // Fetch current event to check if capacity is increasing
  const { data: currentEvent } = await supabase
    .from('events')
    .select('capacity')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('events')
    .update({
      title,
      slug,
      location,
      starts_at,
      ends_at,
      capacity: newCapacity,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  // Handle waitlist auto-promotion logic if capacity has increased or became unlimited
  if (
    currentEvent &&
    currentEvent.capacity !== null &&
    (newCapacity === null || newCapacity > currentEvent.capacity)
  ) {
    // Determine how many spots we can fill
    const { count: registeredCount } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id)
      .eq('status', 'registered');

    if (registeredCount !== null && (newCapacity === null || registeredCount < newCapacity)) {
      const { data: waitlistedUsers } = await supabase
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
          await supabase
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
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client unavailable');

  // Validate admin/staff session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }

  revalidatePath('/admin/events');
  revalidatePath('/events');
  redirect('/admin/events');
}
