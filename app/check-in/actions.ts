'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { logServerError } from '@/lib/observability/logger';

export async function toggleCheckIn(eventId: string, userId: string, isCheckingIn: boolean) {
  const session = await getSession();
  if (
    !session.isAuthenticated ||
    (session.role !== 'staff' && session.role !== 'admin' && session.role !== 'super_admin')
  ) {
    throw new Error('Unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  // Get current auth auth_user_id
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Find profile id for the current user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (isCheckingIn) {
    const { error } = await supabase.from('checkins').insert({
      event_id: eventId,
      user_id: userId,
      checked_in_by: profile?.id,
      method: 'manual',
    });

    if (error) {
      logServerError({
        scope: 'check_in.manual_in',
        message: 'Error checking in',
        error,
        context: {
          eventId,
          userId,
        },
      });
      throw new Error('Failed to check in');
    }
  } else {
    const { error } = await supabase.from('checkins').delete().match({
      event_id: eventId,
      user_id: userId,
    });

    if (error) {
      logServerError({
        scope: 'check_in.manual_out',
        message: 'Error un-checking in',
        error,
        context: {
          eventId,
          userId,
        },
      });
      throw new Error('Failed to un-check in');
    }
  }

  revalidatePath('/check-in');
}
