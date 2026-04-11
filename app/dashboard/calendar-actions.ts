'use server';

import { revalidatePath } from 'next/cache';

import { logServerError } from '@/lib/observability/logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateCalendarEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
};

export type CreateCalendarEventResult = {
  status: 'success' | 'error';
  message: string;
};

function normalizeCalendarEventInput(input: CreateCalendarEventInput) {
  const title = input.title.trim();
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (!title) {
    throw new Error('Add a title before creating the event.');
  }

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error('Choose a valid time window.');
  }

  if (endsAt <= startsAt) {
    throw new Error('The event must end after it starts.');
  }

  return {
    title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

function getCalendarEventErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';
  const normalizedMessage = message.toLowerCase();

  if (code === '42P01' || normalizedMessage.includes('personal_calendar_events')) {
    return 'Calendar storage is not ready yet. The Supabase migration needs to run.';
  }

  if (code === '42501' || normalizedMessage.includes('permission denied')) {
    return 'Calendar storage permissions are not ready yet. The Supabase grants need to run.';
  }

  if (message) {
    return message;
  }

  return 'The calendar event could not be created.';
}

export async function createPersonalCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CreateCalendarEventResult> {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      throw new Error('Supabase is required to create calendar events.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Sign in before creating a calendar event.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Your profile could not be found.');
    }

    const normalized = normalizeCalendarEventInput(input);
    const { error } = await supabase.from('personal_calendar_events').insert({
      owner_profile_id: profile.id,
      title: normalized.title,
      starts_at: normalized.startsAt,
      ends_at: normalized.endsAt,
    });

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard');

    return {
      status: 'success',
      message: 'Event added to your calendar.',
    };
  } catch (error) {
    logServerError({
      scope: 'dashboard.create_calendar_event',
      message: 'Error creating personal calendar event',
      error,
      context: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });

    return {
      status: 'error',
      message: getCalendarEventErrorMessage(error),
    };
  }
}
