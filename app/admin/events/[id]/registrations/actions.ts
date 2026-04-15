'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { appendAdminCancellationReason } from '@/lib/events/admin-utils';

export async function adminForcePromoteWaitlist(eventId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client unavailable');

  // Validate admin/staff session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'registered' })
    .match({ event_id: eventId, user_id: userId });

  if (error) {
    throw new Error(`Failed to force promote registration: ${error.message}`);
  }

  revalidatePath(`/admin/events/${eventId}/registrations`);
  revalidatePath(`/events/${eventId}`);
}

export async function adminCancelRegistration(eventId: string, userId: string, reason: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error('Supabase client unavailable');

  // Validate admin/staff session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch current registration to get status and existing notes
  const { data: currentReg } = await supabase
    .from('event_registrations')
    .select('status, notes')
    .match({ event_id: eventId, user_id: userId })
    .single();

  if (!currentReg) {
    throw new Error('Registration not found');
  }

  // Append new reason to notes object, or create one if it doesn't exist
  let newNotesStr = currentReg.notes;
  if (reason) {
    newNotesStr = appendAdminCancellationReason(currentReg.notes, reason);
  }

  const { error } = await supabase
    .from('event_registrations')
    .update({
      status: 'cancelled',
      notes: newNotesStr,
    })
    .match({ event_id: eventId, user_id: userId });

  if (error) {
    throw new Error(`Failed to cancel registration: ${error.message}`);
  }

  // Handle auto-promotion logic if a registered user cancelled!
  if (currentReg.status === 'registered') {
    const { data: event } = await supabase
      .from('events')
      .select('capacity')
      .eq('id', eventId)
      .single();

    if (event && event.capacity !== null) {
      const { count: registeredCount } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (registeredCount !== null && registeredCount < event.capacity) {
        // Promote the earliest waitlisted entry
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

  revalidatePath(`/admin/events/${eventId}/registrations`);
  revalidatePath(`/events/${eventId}`);
}
