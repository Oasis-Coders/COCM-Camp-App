import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/layout/metric-card';
import { staffPrivilegedRoles } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import { logServerError } from '@/lib/observability/logger';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import {
  DashboardCalendar,
  type CalendarItem,
  type CalendarProfile,
  type CalendarViewMode,
} from './dashboard-calendar';

type DashboardPageProps = {
  searchParams: Promise<{
    week?: string;
    profile?: string;
    view?: string;
    date?: string;
  }>;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type RegistrationRow = {
  id: string;
  status: string | null;
  events:
    | {
        id: string;
        title: string;
        slug: string;
        location: string | null;
        starts_at: string;
        ends_at: string;
      }
    | {
        id: string;
        title: string;
        slug: string;
        location: string | null;
        starts_at: string;
        ends_at: string;
      }[]
    | null;
};

type PersonalEventRow = {
  id: string;
  owner_profile_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_type: 'physical' | 'online' | null;
  location: string | null;
  notes: string | null;
  personal_calendar_event_invitees?: {
    invitee_profile_id: string;
    invite_status: 'pending' | 'accepted' | 'declined' | null;
  }[];
};

type InviteeEventRow = {
  event: PersonalEventRow | PersonalEventRow[] | null;
};

function getWeekStart(input?: string) {
  const candidate = input ? new Date(`${input}T00:00:00`) : new Date();
  const date = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getSelectedDate(input?: string) {
  if (!input) {
    return new Date();
  }

  const candidate = new Date(`${input}T00:00:00`);
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapProfile(row: ProfileRow): CalendarProfile {
  return {
    id: row.id,
    displayName: row.display_name ?? row.email?.split('@')[0] ?? 'Camp user',
    email: row.email ?? 'unknown@example.com',
  };
}

function getJoinedEvent(row: RegistrationRow) {
  return Array.isArray(row.events) ? row.events[0] : row.events;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const session = await getSession();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <AppShell title="Dashboard" eyebrow="Protected route">
        <div className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 text-sm text-slate-600 shadow-panel">
          Connect Supabase to use the dashboard calendar.
        </div>
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: eventCount }, { count: activeTaskCount }, { count: checkinCount }] =
    await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'blocked']),
      supabase.from('checkins').select('*', { count: 'exact', head: true }),
    ]);

  let currentProfile: ProfileRow | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .eq('auth_user_id', user.id)
      .single();
    currentProfile = data;
  }

  const viewMode: CalendarViewMode = params.view === 'day' ? 'day' : 'week';
  const isDayView = viewMode === 'day';

  const weekStart = getWeekStart(isDayView ? params.date : params.week);
  const selectedDayDate = isDayView ? getSelectedDate(params.date) : null;

  const rangeStart = isDayView && selectedDayDate ? selectedDayDate : weekStart;
  const rangeEnd =
    isDayView && selectedDayDate ? addDays(selectedDayDate, 1) : addDays(weekStart, 7);

  const canInspectOthers = staffPrivilegedRoles.includes(session.role);
  const adminSupabase = canInspectOthers ? createSupabaseAdminClient() : null;
  const readClient = adminSupabase ?? supabase;
  const directoryClient = adminSupabase ?? createSupabaseAdminClient() ?? readClient;
  const { data: profileRows } = await readClient
    .from('profiles')
    .select('id, display_name, email')
    .order('display_name', { ascending: true });
  const { data: inviteeProfileRows } = await directoryClient
    .from('profiles')
    .select('id, display_name, email')
    .order('display_name', { ascending: true });
  const profiles = (profileRows ?? []).map(mapProfile);
  const inviteeProfiles = (inviteeProfileRows ?? profileRows ?? []).map(mapProfile);
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const selectedProfileId =
    params.profile &&
    profileIds.has(params.profile) &&
    (canInspectOthers || params.profile === currentProfile?.id)
      ? params.profile
      : currentProfile?.id;

  let calendarItems: CalendarItem[] = [];
  let calendarLoadMessage: string | null = null;

  if (selectedProfileId) {
    const [registrationsResult, personalEventsResult, invitedEventsResult] = await Promise.all([
      readClient
        .from('event_registrations')
        .select(
          `
          id,
          status,
          events!inner (
            id,
            title,
            slug,
            location,
            starts_at,
            ends_at
          )
        `
        )
        .eq('user_id', selectedProfileId)
        .neq('status', 'cancelled')
        .gte('events.starts_at', rangeStart.toISOString())
        .lt('events.starts_at', rangeEnd.toISOString()),
      readClient
        .from('personal_calendar_events')
        .select(
          `
          id,
          owner_profile_id,
          title,
          starts_at,
          ends_at,
          location_type,
          location,
          notes,
          personal_calendar_event_invitees (
            invitee_profile_id,
            invite_status
          )
        `
        )
        .eq('owner_profile_id', selectedProfileId)
        .lt('starts_at', rangeEnd.toISOString())
        .gt('ends_at', rangeStart.toISOString()),
      readClient
        .from('personal_calendar_event_invitees')
        .select(
          `
          event:personal_calendar_events!inner (
            id,
            owner_profile_id,
            title,
            starts_at,
            ends_at,
            location_type,
            location,
            notes,
            personal_calendar_event_invitees (
              invitee_profile_id,
              invite_status
            )
          )
        `
        )
        .eq('invitee_profile_id', selectedProfileId),
    ]);

    const registrationItems: CalendarItem[] = (
      (registrationsResult.data ?? []) as RegistrationRow[]
    ).flatMap((registration) => {
      const event = getJoinedEvent(registration);

      if (!event) {
        return [];
      }

      return [
        {
          id: `registration-${registration.id}`,
          title: event.title,
          location: event.location,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          kind: 'event' as const,
          status: registration.status,
          href: `/events/${event.slug}`,
        },
      ];
    });

    if (registrationsResult.error) {
      logServerError({
        scope: 'dashboard.load_event_registrations',
        message: 'Error loading event registrations for dashboard calendar',
        error: registrationsResult.error,
        context: {
          selectedProfileId,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        },
      });
    }

    if (personalEventsResult.error || invitedEventsResult.error) {
      logServerError({
        scope: 'dashboard.load_personal_calendar_events',
        message: 'Error loading personal dashboard calendar events',
        error: personalEventsResult.error ?? invitedEventsResult.error,
        context: {
          selectedProfileId,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        },
      });
      calendarLoadMessage =
        'Personal calendar events could not be loaded. The calendar storage migration may need to run.';
    }

    const ownedPersonalEvents = (personalEventsResult.data ?? []) as PersonalEventRow[];
    const invitedPersonalEvents = ((invitedEventsResult.data ?? []) as InviteeEventRow[])
      .flatMap((row) => {
        if (!row.event) {
          return [];
        }

        return Array.isArray(row.event) ? row.event : [row.event];
      })
      .filter(
        (event) => new Date(event.starts_at) < rangeEnd && new Date(event.ends_at) > rangeStart
      );
    const personalEventsById = new Map(
      [...ownedPersonalEvents, ...invitedPersonalEvents].map((event) => [event.id, event])
    );

    const personalItems = Array.from(personalEventsById.values()).map((event) => {
      const invitees =
        event.personal_calendar_event_invitees?.map((invitee) => ({
          profileId: invitee.invitee_profile_id,
          status: invitee.invite_status ?? ('pending' as const),
        })) ?? [];
      const currentInvite = invitees.find((invitee) => invitee.profileId === selectedProfileId);
      const isSelectedProfileInvited = event.owner_profile_id !== selectedProfileId;

      return {
        id: `personal-${event.id}`,
        sourceId: event.id,
        ownerProfileId: event.owner_profile_id,
        title: event.title,
        locationType: event.location_type ?? 'physical',
        location: event.location,
        notes: event.notes,
        inviteeProfileIds: invitees.map((invitee) => invitee.profileId),
        invitees,
        currentInviteStatus: isSelectedProfileInvited
          ? (currentInvite?.status ?? 'pending')
          : undefined,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        kind: 'personal' as const,
      };
    });

    calendarItems = [...registrationItems, ...personalItems].sort(
      (first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
    );
  }

  return (
    <AppShell title="Dashboard" eyebrow="Protected route">
      <div className="mb-6 grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Open events"
          value={String(eventCount ?? 0)}
          helper="Total events visible to you across all statuses."
        />
        <MetricCard
          label="Active tasks"
          value={String(activeTaskCount ?? 0)}
          helper="Tasks in 'open', 'in progress', or 'blocked' status."
        />
        <MetricCard
          label="Check-ins"
          value={String(checkinCount ?? 0)}
          helper="Total confirmed check-ins across all events."
        />
      </div>

      {currentProfile && selectedProfileId ? (
        <>
          {calendarLoadMessage ? (
            <div className="mb-4 rounded-2xl border border-camp-ember/20 bg-camp-ember/10 px-4 py-3 text-sm font-semibold text-camp-forest">
              {calendarLoadMessage}
            </div>
          ) : null}
          <DashboardCalendar
            currentProfileId={currentProfile.id}
            selectedProfileId={selectedProfileId}
            profiles={profiles.length > 0 ? profiles : [mapProfile(currentProfile)]}
            inviteeProfiles={
              inviteeProfiles.length > 0
                ? inviteeProfiles
                : profiles.length > 0
                  ? profiles
                  : [mapProfile(currentProfile)]
            }
            items={calendarItems}
            weekStart={toDateInputValue(weekStart)}
            viewMode={viewMode}
            selectedDate={selectedDayDate ? toDateInputValue(selectedDayDate) : undefined}
          />
        </>
      ) : (
        <div className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 text-sm text-slate-600 shadow-panel">
          Your profile needs to finish syncing before the dashboard calendar can load.
        </div>
      )}
    </AppShell>
  );
}
