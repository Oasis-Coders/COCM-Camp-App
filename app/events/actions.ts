'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function registerForEvent(eventId: string) {
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

  // Get the profile ID for this auth user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  const { error } = await supabase.from('event_registrations').insert({
    event_id: eventId,
    user_id: profile.id,
    status: 'registered',
  });

  if (error) {
    if (error.code === '23505') {
      // unique constraint — already registered
      return { alreadyRegistered: true };
    }
    throw new Error('Failed to register');
  }

  revalidatePath(`/events`);
  return { alreadyRegistered: false };
}

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

  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .match({ event_id: eventId, user_id: profile.id });

  if (error) {
    throw new Error('Failed to cancel registration');
  }

  revalidatePath(`/events`);
}
