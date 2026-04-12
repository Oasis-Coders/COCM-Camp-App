'use server';

import { revalidatePath } from 'next/cache';

import { logServerError } from '@/lib/observability/logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CreateCalendarEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  locationType?: string;
  location?: string;
  notes?: string;
  inviteeProfileIds?: string[];
};

export type UpdateCalendarEventInput = CreateCalendarEventInput & {
  id: string;
};

export type CalendarEventResult = {
  status: 'success' | 'error';
  message: string;
};

type NormalizedCalendarEventInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  locationType: 'physical' | 'online';
  location: string | null;
  notes: string | null;
  inviteeProfileIds: string[];
};

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

function normalizeCalendarEventInput(
  input: CreateCalendarEventInput
): NormalizedCalendarEventInput {
  const title = input.title.trim();
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  const locationType = input.locationType === 'online' ? 'online' : 'physical';

  if (!title) {
    throw new Error('Add a title before saving the event.');
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
    locationType,
    location: normalizeOptionalText(input.location),
    notes: normalizeOptionalText(input.notes),
    inviteeProfileIds: [...new Set(input.inviteeProfileIds ?? [])].filter(Boolean),
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

  if (
    code === '42P01' ||
    normalizedMessage.includes('personal_calendar_events') ||
    normalizedMessage.includes('personal_calendar_event_invitees')
  ) {
    return 'Calendar storage is not ready yet. The Supabase migration needs to run.';
  }

  if (code === '42501' || normalizedMessage.includes('permission denied')) {
    return 'Calendar storage permissions are not ready yet. The Supabase grants need to run.';
  }

  if (message) {
    return message;
  }

  return 'The calendar event could not be saved.';
}

async function getCalendarActionContext() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error('Supabase is required to manage calendar events.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Sign in before managing calendar events.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Your profile could not be found.');
  }

  return { supabase, profileId: profile.id as string };
}

async function replaceInvitees(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  eventId: string,
  inviteeProfileIds: string[]
) {
  const { error: deleteError } = await supabase
    .from('personal_calendar_event_invitees')
    .delete()
    .eq('event_id', eventId);

  if (deleteError) {
    throw deleteError;
  }

  if (inviteeProfileIds.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from('personal_calendar_event_invitees').insert(
    inviteeProfileIds.map((inviteeProfileId) => ({
      event_id: eventId,
      invitee_profile_id: inviteeProfileId,
    }))
  );

  if (insertError) {
    throw insertError;
  }
}

export async function createPersonalCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CalendarEventResult> {
  try {
    const { supabase, profileId } = await getCalendarActionContext();
    const normalized = normalizeCalendarEventInput(input);
    const inviteeProfileIds = normalized.inviteeProfileIds.filter((id) => id !== profileId);

    const { data: event, error } = await supabase
      .from('personal_calendar_events')
      .insert({
        owner_profile_id: profileId,
        title: normalized.title,
        starts_at: normalized.startsAt,
        ends_at: normalized.endsAt,
        location_type: normalized.locationType,
        location: normalized.location,
        notes: normalized.notes,
      })
      .select('id')
      .single();

    if (error || !event) {
      throw error;
    }

    await replaceInvitees(supabase, event.id as string, inviteeProfileIds);

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

export async function updatePersonalCalendarEvent(
  input: UpdateCalendarEventInput
): Promise<CalendarEventResult> {
  try {
    const eventId = input.id.trim();

    if (!eventId) {
      throw new Error('Choose an event to edit.');
    }

    const { supabase, profileId } = await getCalendarActionContext();
    const normalized = normalizeCalendarEventInput(input);
    const inviteeProfileIds = normalized.inviteeProfileIds.filter((id) => id !== profileId);

    const { data: existingEvent, error: readError } = await supabase
      .from('personal_calendar_events')
      .select('id')
      .eq('id', eventId)
      .eq('owner_profile_id', profileId)
      .single();

    if (readError || !existingEvent) {
      throw new Error('You can only edit events on your own calendar.');
    }

    const { error } = await supabase
      .from('personal_calendar_events')
      .update({
        title: normalized.title,
        starts_at: normalized.startsAt,
        ends_at: normalized.endsAt,
        location_type: normalized.locationType,
        location: normalized.location,
        notes: normalized.notes,
      })
      .eq('id', eventId)
      .eq('owner_profile_id', profileId);

    if (error) {
      throw error;
    }

    await replaceInvitees(supabase, eventId, inviteeProfileIds);

    revalidatePath('/dashboard');

    return {
      status: 'success',
      message: 'Event updated.',
    };
  } catch (error) {
    logServerError({
      scope: 'dashboard.update_calendar_event',
      message: 'Error updating personal calendar event',
      error,
      context: {
        eventId: input.id,
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
