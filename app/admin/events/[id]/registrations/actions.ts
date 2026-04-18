'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { staffPrivilegedRoles, type AppRole } from '@/lib/app-config';
import { appendAdminCancellationReason } from '@/lib/events/admin-utils';
import { determineRegistrationStatus } from '@/lib/events/registration-utils';

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

export async function adminForcePromoteWaitlist(eventId: string, userId: string) {
  await requireStaffUser();
  const adminClient = requireAdminClient();

  const { error } = await adminClient
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
  await requireStaffUser();
  const adminClient = requireAdminClient();

  // Fetch current registration to get status and existing notes
  const { data: currentReg } = await adminClient
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

  const { error } = await adminClient
    .from('event_registrations')
    .update({
      status: 'cancelled',
      notes: newNotesStr,
    })
    .match({ event_id: eventId, user_id: userId });

  if (error) {
    throw new Error(`Failed to cancel registration: ${error.message}`);
  }

  // Handle auto-promotion logic if a registered user cancelled
  if (currentReg.status === 'registered') {
    const { data: event } = await adminClient
      .from('events')
      .select('capacity')
      .eq('id', eventId)
      .single();

    if (event && event.capacity !== null) {
      const { count: registeredCount } = await adminClient
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (registeredCount !== null && registeredCount < event.capacity) {
        // Promote the earliest waitlisted entry
        const { data: nextInLine } = await adminClient
          .from('event_registrations')
          .select('user_id')
          .eq('event_id', eventId)
          .eq('status', 'waitlisted')
          .order('registered_at', { ascending: true })
          .limit(1)
          .single();

        if (nextInLine) {
          await adminClient
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

/**
 * Manually registers a user for an event. Staff can register anyone.
 * Respects capacity — if full, the user is waitlisted.
 */
export async function adminManualRegister(eventId: string, userId: string) {
  await requireStaffUser();
  const adminClient = requireAdminClient();

  // Check if user already has an active registration
  const { data: existingReg } = await adminClient
    .from('event_registrations')
    .select('status')
    .match({ event_id: eventId, user_id: userId })
    .maybeSingle();

  if (existingReg && (existingReg.status === 'registered' || existingReg.status === 'waitlisted')) {
    throw new Error('User already has an active registration for this event');
  }

  // Fetch event to check capacity
  const { data: event } = await adminClient
    .from('events')
    .select('capacity')
    .eq('id', eventId)
    .single();

  if (!event) {
    throw new Error('Event not found');
  }

  // Count current registrations to determine status
  let registeredCount: number | null = null;
  if (event.capacity !== null) {
    const { count } = await adminClient
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'registered');
    registeredCount = count;
  }

  const newStatus = determineRegistrationStatus(event.capacity, registeredCount);

  const { error } = await adminClient.from('event_registrations').upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: newStatus,
      registered_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,user_id' }
  );

  if (error) {
    throw new Error(`Failed to register user: ${error.message}`);
  }

  revalidatePath(`/admin/events/${eventId}/registrations`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath('/events');
}
