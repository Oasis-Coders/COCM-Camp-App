'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';

import {
  createPersonalCalendarEvent,
  deletePersonalCalendarEvent,
  respondToCalendarInvite,
  updatePersonalCalendarEvent,
} from './calendar-actions';

export type CalendarProfile = {
  id: string;
  displayName: string;
  email: string;
};

export type CalendarInviteStatus = 'pending' | 'accepted' | 'declined';

export type CalendarInvitee = {
  profileId: string;
  status: CalendarInviteStatus;
};

export type CalendarItem = {
  id: string;
  sourceId?: string;
  ownerProfileId?: string;
  title: string;
  locationType?: 'physical' | 'online';
  location?: string | null;
  notes?: string | null;
  inviteeProfileIds?: string[];
  invitees?: CalendarInvitee[];
  currentInviteStatus?: CalendarInviteStatus;
  startsAt: string;
  endsAt: string;
  kind: 'event' | 'personal';
  status?: string | null;
  href?: string;
};

type Selection = {
  dayIndex: number;
  startSlot: number;
  endSlot: number;
};

type CalendarEventFormState = {
  mode: 'create' | 'edit';
  id?: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  locationType: 'physical' | 'online';
  location: string;
  notes: string;
  inviteeProfileIds: string[];
};

type PositionedCalendarItem = {
  item: CalendarItem;
  layout: {
    dayIndex: number;
    startMinutes: number;
    endMinutes: number;
    top: number;
    height: number;
    left: number;
    width: number;
  };
};

const dayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayCount = 7;
const slotMinutes = 30;
const startHour = 6;
const endHour = 22;
const slotsPerDay = ((endHour - startHour) * 60) / slotMinutes;

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

function toTimeInputValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildLocalDateTime(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`);
}

function slotToDate(weekStart: Date, dayIndex: number, slotIndex: number) {
  const date = addDays(weekStart, dayIndex);
  date.setHours(startHour, slotIndex * slotMinutes, 0, 0);
  return date;
}

function getItemLayout(item: CalendarItem, weekStart: Date) {
  const startsAt = new Date(item.startsAt);
  const endsAt = new Date(item.endsAt);
  const dayIndex = Math.floor(
    (new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()).getTime() -
      new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime()) /
      86_400_000
  );

  if (dayIndex < 0 || dayIndex >= dayCount) {
    return null;
  }

  const startMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMinutes = endsAt.getHours() * 60 + endsAt.getMinutes();
  const top = Math.max(0, ((startMinutes - startHour * 60) / ((endHour - startHour) * 60)) * 100);
  const height = Math.max(5, ((endMinutes - startMinutes) / ((endHour - startHour) * 60)) * 100);

  return {
    dayIndex,
    startMinutes,
    endMinutes,
    top,
    height: Math.min(height, 100 - top),
  };
}

function buildPositionedCalendarItems(
  items: CalendarItem[],
  weekStartDate: Date
): Map<number, PositionedCalendarItem[]> {
  const dayBuckets = new Map<number, PositionedCalendarItem[]>();

  for (const item of items) {
    const layout = getItemLayout(item, weekStartDate);

    if (!layout) {
      continue;
    }

    const bucket = dayBuckets.get(layout.dayIndex) ?? [];
    bucket.push({
      item,
      layout: {
        ...layout,
        left: 0,
        width: 100,
      },
    });
    dayBuckets.set(layout.dayIndex, bucket);
  }

  for (const [dayIndex, bucket] of dayBuckets) {
    const sorted = [...bucket].sort((first, second) => {
      if (first.layout.startMinutes !== second.layout.startMinutes) {
        return first.layout.startMinutes - second.layout.startMinutes;
      }

      return first.layout.endMinutes - second.layout.endMinutes;
    });
    const positioned: PositionedCalendarItem[] = [];

    let cluster: PositionedCalendarItem[] = [];
    let clusterEnd = -Infinity;

    const flushCluster = () => {
      if (cluster.length === 0) {
        return;
      }

      const columns: PositionedCalendarItem[][] = [];

      for (const entry of cluster) {
        let columnIndex = columns.findIndex((column) => {
          const lastItem = column[column.length - 1];
          return lastItem.layout.endMinutes <= entry.layout.startMinutes;
        });

        if (columnIndex === -1) {
          columnIndex = columns.length;
          columns.push([]);
        }

        columns[columnIndex].push(entry);
      }

      const columnCount = Math.max(columns.length, 1);

      for (const [columnIndex, column] of columns.entries()) {
        for (const entry of column) {
          entry.layout.left = (columnIndex / columnCount) * 100;
          entry.layout.width = 100 / columnCount;
          positioned.push(entry);
        }
      }

      cluster = [];
      clusterEnd = -Infinity;
    };

    for (const entry of sorted) {
      if (cluster.length === 0 || entry.layout.startMinutes < clusterEnd) {
        cluster.push(entry);
        clusterEnd = Math.max(clusterEnd, entry.layout.endMinutes);
        continue;
      }

      flushCluster();
      cluster.push(entry);
      clusterEnd = entry.layout.endMinutes;
    }

    flushCluster();
    dayBuckets.set(dayIndex, positioned);
  }

  return dayBuckets;
}

function buildDashboardHref(week: Date, profileId: string) {
  return `/dashboard?week=${toDateInputValue(week)}&profile=${profileId}`;
}

function getInviteStatusLabel(status: CalendarInviteStatus) {
  if (status === 'accepted') {
    return 'Accepted';
  }

  if (status === 'declined') {
    return 'Declined';
  }

  return 'Pending';
}

function getInviteStatusClassName(status: CalendarInviteStatus) {
  if (status === 'accepted') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'declined') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function getInviteStatusSummary(invitees: CalendarInvitee[] = []) {
  const counts = invitees.reduce(
    (summary, invitee) => {
      summary[invitee.status] += 1;
      return summary;
    },
    { accepted: 0, declined: 0, pending: 0 }
  );

  return [
    counts.accepted > 0 ? `${counts.accepted} accepted` : null,
    counts.declined > 0 ? `${counts.declined} declined` : null,
    counts.pending > 0 ? `${counts.pending} pending` : null,
  ].filter(Boolean);
}

function NavArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`size-4 ${direction === 'right' ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 6L8 12L14 18" />
    </svg>
  );
}

function BucketIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7h10" />
      <path d="M9 7l1-2h4l1 2" />
      <path d="M6 7h12l-1 12H7L6 7Z" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function DashboardCalendar({
  currentProfileId,
  selectedProfileId,
  profiles,
  inviteeProfiles,
  items,
  weekStart,
}: {
  currentProfileId: string;
  selectedProfileId: string;
  profiles: CalendarProfile[];
  inviteeProfiles: CalendarProfile[];
  items: CalendarItem[];
  weekStart: string;
}) {
  const router = useRouter();
  const weekStartDate = useMemo(() => new Date(`${weekStart}T00:00:00`), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => addDays(weekStartDate, index)),
    [weekStartDate]
  );
  const inviteeOptions = useMemo(
    () => inviteeProfiles.filter((profile) => profile.id !== currentProfileId),
    [currentProfileId, inviteeProfiles]
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [eventForm, setEventForm] = useState<CalendarEventFormState | null>(null);
  const [inviteeSearch, setInviteeSearch] = useState('');
  const [rsvpEvent, setRsvpEvent] = useState<CalendarItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const canEdit = selectedProfileId === currentProfileId;
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const previousWeek = addDays(weekStartDate, -7);
  const nextWeek = addDays(weekStartDate, 7);
  const now = new Date();
  const todayIndex = days.findIndex(
    (day) =>
      day.getFullYear() === now.getFullYear() &&
      day.getMonth() === now.getMonth() &&
      day.getDate() === now.getDate()
  );
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine = todayIndex >= 0 && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60;
  const nowTop = ((nowMinutes - startHour * 60) / ((endHour - startHour) * 60)) * 100;
  const profileById = useMemo(
    () => new Map([...profiles, ...inviteeProfiles].map((profile) => [profile.id, profile])),
    [inviteeProfiles, profiles]
  );
  const positionedItemsByDay = useMemo(
    () => buildPositionedCalendarItems(items, weekStartDate),
    [items, weekStartDate]
  );
  const selectedInviteeProfiles = useMemo(
    () =>
      eventForm
        ? eventForm.inviteeProfileIds
            .map((profileId) => profileById.get(profileId))
            .filter((profile): profile is CalendarProfile => Boolean(profile))
        : [],
    [eventForm, profileById]
  );
  const inviteeQuery = inviteeSearch.trim();
  const filteredInviteeOptions = useMemo(() => {
    if (!eventForm || inviteeQuery.length === 0) {
      return [];
    }

    const query = inviteeQuery.toLowerCase();

    return inviteeOptions
      .filter((profile) => !eventForm.inviteeProfileIds.includes(profile.id))
      .filter((profile) => {
        if (!query) {
          return true;
        }

        return `${profile.displayName} ${profile.email}`.toLowerCase().includes(query);
      })
      .slice(0, 6);
  }, [eventForm, inviteeOptions, inviteeQuery]);
  const editingCalendarItem = useMemo(
    () =>
      eventForm?.mode === 'edit'
        ? items.find((item) => item.kind === 'personal' && item.sourceId === eventForm.id)
        : undefined,
    [eventForm, items]
  );

  function beginSelection(dayIndex: number, slotIndex: number) {
    if (!canEdit || pending) {
      return;
    }

    setMessage(null);
    setSelection({ dayIndex, startSlot: slotIndex, endSlot: slotIndex });
    setDragging(true);
  }

  function extendSelection(dayIndex: number, slotIndex: number) {
    if (!dragging || !selection || selection.dayIndex !== dayIndex) {
      return;
    }

    setSelection({ ...selection, endSlot: slotIndex });
  }

  function finishSelection() {
    if (!dragging || !selection) {
      return;
    }

    setDragging(false);

    const firstSlot = Math.min(selection.startSlot, selection.endSlot);
    const lastSlot = Math.max(selection.startSlot, selection.endSlot);
    const startsAt = slotToDate(weekStartDate, selection.dayIndex, firstSlot);
    const endsAt = slotToDate(weekStartDate, selection.dayIndex, lastSlot + 1);
    setSelection(null);
    setInviteeSearch('');
    setEventForm({
      mode: 'create',
      title: '',
      startsAt,
      endsAt,
      locationType: 'physical',
      location: '',
      notes: '',
      inviteeProfileIds: [],
    });
  }

  function openPersonalEvent(item: CalendarItem) {
    if (item.kind !== 'personal' || !item.sourceId || pending) {
      return;
    }

    if (canEdit && item.ownerProfileId === currentProfileId) {
      setMessage(null);
      setInviteeSearch('');
      setEventForm({
        mode: 'edit',
        id: item.sourceId,
        title: item.title,
        startsAt: new Date(item.startsAt),
        endsAt: new Date(item.endsAt),
        locationType: item.locationType ?? 'physical',
        location: item.location ?? '',
        notes: item.notes ?? '',
        inviteeProfileIds: item.inviteeProfileIds ?? [],
      });
      return;
    }

    if (selectedProfileId === currentProfileId && item.ownerProfileId !== currentProfileId) {
      setMessage(null);
      setRsvpEvent(item);
    }
  }

  function addInvitee(profileId: string) {
    if (!eventForm || eventForm.inviteeProfileIds.includes(profileId)) {
      return;
    }

    updateEventForm({ inviteeProfileIds: [...eventForm.inviteeProfileIds, profileId] });
    setInviteeSearch('');
  }

  function removeInvitee(profileId: string) {
    if (!eventForm) {
      return;
    }

    updateEventForm({
      inviteeProfileIds: eventForm.inviteeProfileIds.filter((id) => id !== profileId),
    });
  }

  function updateEventForm(patch: Partial<CalendarEventFormState>) {
    setEventForm((current) => (current ? { ...current, ...patch } : current));
  }

  function saveEventForm() {
    if (!eventForm) {
      return;
    }

    if (!eventForm.title.trim()) {
      setMessage('Add a title before saving the event.');
      return;
    }

    const payload = {
      title: eventForm.title,
      startsAt: eventForm.startsAt.toISOString(),
      endsAt: eventForm.endsAt.toISOString(),
      locationType: eventForm.locationType,
      location: eventForm.location,
      notes: eventForm.notes,
      inviteeProfileIds: eventForm.inviteeProfileIds,
    };

    setPending(true);
    startTransition(async () => {
      const result =
        eventForm.mode === 'edit' && eventForm.id
          ? await updatePersonalCalendarEvent({ ...payload, id: eventForm.id })
          : await createPersonalCalendarEvent(payload);
      setMessage(result.message);
      setPending(false);

      if (result.status === 'success') {
        setEventForm(null);
        router.refresh();
      }
    });
  }

  function respondToInvite(status: 'accepted' | 'declined') {
    if (!rsvpEvent?.sourceId) {
      return;
    }

    setPending(true);
    startTransition(async () => {
      const result = await respondToCalendarInvite({ eventId: rsvpEvent.sourceId!, status });
      setMessage(result.message);
      setPending(false);

      if (result.status === 'success') {
        setRsvpEvent(null);
        router.refresh();
      }
    });
  }

  function deleteEvent() {
    if (!eventForm?.id) {
      return;
    }

    const confirmed = window.confirm('Delete this calendar event?');

    if (!confirmed) {
      return;
    }

    setPending(true);
    startTransition(async () => {
      const result = await deletePersonalCalendarEvent({ id: eventForm.id! });
      setMessage(result.message);
      setPending(false);

      if (result.status === 'success') {
        setEventForm(null);
        router.refresh();
      }
    });
  }

  function updateFormDate(value: string) {
    if (!eventForm) {
      return;
    }

    updateEventForm({
      startsAt: buildLocalDateTime(value, toTimeInputValue(eventForm.startsAt)),
      endsAt: buildLocalDateTime(value, toTimeInputValue(eventForm.endsAt)),
    });
  }

  function updateFormStartTime(value: string) {
    if (!eventForm) {
      return;
    }

    const startsAt = buildLocalDateTime(toDateInputValue(eventForm.startsAt), value);
    const endsAt =
      eventForm.endsAt > startsAt
        ? eventForm.endsAt
        : new Date(startsAt.getTime() + slotMinutes * 60_000);

    updateEventForm({ startsAt, endsAt });
  }

  function updateFormEndTime(value: string) {
    if (!eventForm) {
      return;
    }

    updateEventForm({
      endsAt: buildLocalDateTime(toDateInputValue(eventForm.startsAt), value),
    });
  }

  return (
    <section className="rounded-[32px] border border-camp-forest/10 bg-white/90 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-camp-moss">Weekly calendar</p>
          <h2 className="mt-3 font-serif text-3xl text-camp-forest">
            {selectedProfile?.displayName ?? 'Calendar'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {canEdit
              ? 'Tap or drag across a time window to add a personal event. Select an event to edit it.'
              : "Viewing another user's calendar. Event creation is disabled in this view."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm font-semibold text-camp-forest">
            <span className="sr-only">Calendar owner</span>
            <select
              value={selectedProfileId}
              onChange={(event) => {
                router.push(buildDashboardHref(weekStartDate, event.target.value));
              }}
              className="w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky/70 sm:w-64"
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.displayName} {profile.id === currentProfileId ? '(me)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={buildDashboardHref(previousWeek, selectedProfileId)}
              className="inline-flex items-center justify-center rounded-2xl border border-camp-forest/10 bg-camp-sand/45 px-4 py-3 text-center text-sm font-semibold text-camp-forest transition hover:bg-camp-sand"
              aria-label="Previous week"
            >
              <NavArrowIcon direction="left" />
            </Link>
            <Link
              href={buildDashboardHref(nextWeek, selectedProfileId)}
              className="inline-flex items-center justify-center rounded-2xl bg-camp-forest px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-camp-moss"
              aria-label="Next week"
            >
              <NavArrowIcon direction="right" />
            </Link>
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-camp-forest/10 bg-camp-sky/55 px-4 py-3 text-sm text-camp-forest">
          {message}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-[28px] border border-camp-forest/10 bg-camp-sand/20">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))] border-b border-camp-forest/10 bg-white/80">
            <div className="px-3 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-camp-moss">
              Time
            </div>
            {days.map((day) => (
              <div key={day.toISOString()} className="border-l border-camp-forest/10 px-3 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-camp-moss">
                  {dayFormatter.format(day)}
                </p>
                <p className="mt-1 font-serif text-xl text-camp-forest">
                  {dateFormatter.format(day)}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
            <div
              className="grid"
              style={{ gridTemplateRows: `repeat(${endHour - startHour}, 72px)` }}
            >
              {Array.from({ length: endHour - startHour }, (_, index) => (
                <div
                  key={index}
                  className="border-b border-camp-forest/10 bg-white/55 px-3 pt-2 text-xs text-slate-500"
                >
                  {String(startHour + index).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {days.map((day, dayIndex) => (
              <div
                key={day.toISOString()}
                className="relative border-l border-camp-forest/10 bg-white/40"
                style={{ height: `${(endHour - startHour) * 72}px` }}
                onPointerLeave={() => {
                  if (dragging) {
                    setDragging(false);
                  }
                }}
              >
                <div
                  className="absolute inset-0 grid"
                  style={{ gridTemplateRows: `repeat(${slotsPerDay}, 36px)` }}
                >
                  {Array.from({ length: slotsPerDay }, (_, slotIndex) => {
                    const isSelected =
                      selection?.dayIndex === dayIndex &&
                      slotIndex >= Math.min(selection.startSlot, selection.endSlot) &&
                      slotIndex <= Math.max(selection.startSlot, selection.endSlot);

                    return (
                      <button
                        key={slotIndex}
                        type="button"
                        disabled={!canEdit || pending}
                        aria-label={`Create event on ${dateFormatter.format(day)} at ${timeFormatter.format(
                          slotToDate(weekStartDate, dayIndex, slotIndex)
                        )}`}
                        className={`border-b border-camp-forest/5 transition ${
                          canEdit ? 'cursor-crosshair hover:bg-camp-sky/40' : 'cursor-default'
                        } ${isSelected ? 'bg-camp-sky/70' : ''}`}
                        onPointerDown={() => beginSelection(dayIndex, slotIndex)}
                        onPointerEnter={() => extendSelection(dayIndex, slotIndex)}
                        onPointerUp={finishSelection}
                      />
                    );
                  })}
                </div>

                {showNowLine && todayIndex === dayIndex ? (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                    style={{ top: `${nowTop}%` }}
                  >
                    <span className="size-2 rounded-full bg-camp-ember shadow" />
                    <span className="h-0.5 flex-1 bg-camp-ember shadow" />
                    <span className="mr-2 rounded-full bg-camp-ember px-2 py-0.5 text-[10px] font-semibold text-white">
                      Now
                    </span>
                  </div>
                ) : null}

                {(positionedItemsByDay.get(dayIndex) ?? []).map(({ item, layout }) => {
                  const isOwnPersonalEvent =
                    item.kind === 'personal' && item.ownerProfileId === currentProfileId;
                  const isInvitedPersonalEvent =
                    item.kind === 'personal' && item.ownerProfileId !== currentProfileId;
                  const isDeclinedInvite =
                    item.currentInviteStatus === 'declined' && isInvitedPersonalEvent;
                  const inviteSummary = getInviteStatusSummary(item.invitees);
                  const itemClassName = `absolute z-10 overflow-hidden rounded-2xl border px-3 py-2 text-left text-xs shadow-sm transition ${
                    item.kind === 'event'
                      ? 'border-camp-forest/15 bg-camp-forest text-white'
                      : item.currentInviteStatus === 'pending' && isInvitedPersonalEvent
                        ? 'border-slate-200 bg-slate-100 text-slate-700'
                        : item.currentInviteStatus === 'declined' && isInvitedPersonalEvent
                          ? 'border-slate-200 bg-white text-slate-500 opacity-80'
                          : 'border-camp-moss/20 bg-camp-sky text-camp-forest'
                  } ${
                    item.kind === 'personal' &&
                    ((canEdit && isOwnPersonalEvent) ||
                      (selectedProfileId === currentProfileId && isInvitedPersonalEvent))
                      ? 'hover:border-camp-forest/35 hover:bg-white'
                      : ''
                  } ${isDeclinedInvite ? 'line-through decoration-2' : ''}`;
                  const itemStyle = {
                    top: `${layout.top}%`,
                    left: `calc(${layout.left}% + 0.5rem)`,
                    width: `calc(${layout.width}% - 1rem)`,
                    height: `${layout.height}%`,
                  };
                  const content = (
                    <>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 opacity-85">
                        {timeFormatter.format(new Date(item.startsAt))}-
                        {timeFormatter.format(new Date(item.endsAt))}
                      </p>
                      {item.location ? (
                        <p className="mt-1 truncate opacity-80">{item.location}</p>
                      ) : null}
                      {item.currentInviteStatus && isInvitedPersonalEvent ? (
                        <p className="mt-1 font-semibold opacity-85">
                          {getInviteStatusLabel(item.currentInviteStatus)}
                        </p>
                      ) : null}
                      {isOwnPersonalEvent && inviteSummary.length > 0 ? (
                        <p className="mt-1 truncate opacity-85">{inviteSummary.join(' · ')}</p>
                      ) : null}
                    </>
                  );

                  if (item.kind === 'personal') {
                    const canOpenPersonalEvent =
                      (canEdit && isOwnPersonalEvent) ||
                      (selectedProfileId === currentProfileId && isInvitedPersonalEvent);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!canOpenPersonalEvent || pending}
                        className={itemClassName}
                        style={itemStyle}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => openPersonalEvent(item)}
                      >
                        {content}
                      </button>
                    );
                  }

                  return item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={itemClassName}
                      style={itemStyle}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id} className={itemClassName} style={itemStyle}>
                      {content}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-dashed border-camp-forest/20 bg-camp-sand/25 p-5 text-sm text-slate-600">
          No events are scheduled in this week. Use the calendar grid to create one for yourself.
        </div>
      ) : null}

      {eventForm ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-camp-forest/35 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-event-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setEventForm(null);
            }
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveEventForm();
            }}
            className="w-full max-w-2xl rounded-[32px] border border-camp-forest/10 bg-white p-6 shadow-panel"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-camp-moss">
                  {eventForm.mode === 'edit' ? 'Edit event' : 'New event'}
                </p>
                <h3
                  id="calendar-event-modal-title"
                  className="mt-2 font-serif text-3xl text-camp-forest"
                >
                  {eventForm.mode === 'edit' ? 'Edit calendar event' : 'Create calendar event'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add the timing, invitees, notes, and where everyone should meet.
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setEventForm(null)}
                className="rounded-full border border-camp-forest/10 px-3 py-1 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/40 disabled:cursor-wait disabled:opacity-70"
                aria-label="Close event modal"
              >
                x
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="text-sm font-semibold text-camp-forest">
                Title
                <input
                  value={eventForm.title}
                  onChange={(event) => updateEventForm({ title: event.target.value })}
                  autoFocus
                  required
                  className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-semibold text-camp-forest">
                  Date
                  <input
                    type="date"
                    value={toDateInputValue(eventForm.startsAt)}
                    onChange={(event) => updateFormDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                  />
                </label>
                <label className="text-sm font-semibold text-camp-forest">
                  Start
                  <input
                    type="time"
                    step={slotMinutes * 60}
                    value={toTimeInputValue(eventForm.startsAt)}
                    onChange={(event) => updateFormStartTime(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                  />
                </label>
                <label className="text-sm font-semibold text-camp-forest">
                  End
                  <input
                    type="time"
                    step={slotMinutes * 60}
                    value={toTimeInputValue(eventForm.endsAt)}
                    onChange={(event) => updateFormEndTime(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <label className="text-sm font-semibold text-camp-forest">
                  Location type
                  <select
                    value={eventForm.locationType}
                    onChange={(event) =>
                      updateEventForm({
                        locationType: event.target.value === 'online' ? 'online' : 'physical',
                      })
                    }
                    className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                  >
                    <option value="physical">Location</option>
                    <option value="online">Online</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-camp-forest">
                  {eventForm.locationType === 'online' ? 'Zoom link' : 'Location name'}
                  <input
                    value={eventForm.location}
                    onChange={(event) => updateEventForm({ location: event.target.value })}
                    placeholder={
                      eventForm.locationType === 'online' ? 'https://zoom.us/j/...' : 'North Hall'
                    }
                    className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                  />
                </label>
              </div>

              <div className="text-sm font-semibold text-camp-forest">
                <label htmlFor="calendar-invitee-search">Invitees</label>
                <input
                  id="calendar-invitee-search"
                  type="search"
                  value={inviteeSearch}
                  onChange={(event) => setInviteeSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="mt-2 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                />

                {selectedInviteeProfiles.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedInviteeProfiles.map((profile) => (
                      <span
                        key={profile.id}
                        className="inline-flex items-center gap-2 rounded-full border border-camp-moss/15 bg-camp-sky/55 px-3 py-1.5 text-xs font-semibold text-camp-forest"
                      >
                        {profile.displayName}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => removeInvitee(profile.id)}
                          className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-camp-forest transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
                        >
                          Remove
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs font-normal text-slate-500">
                    Search and add one or more people to invite.
                  </p>
                )}

                {inviteeQuery.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-camp-forest/10 bg-camp-sand/20 shadow-sm">
                    <div className="max-h-60 overflow-y-auto p-2">
                      {filteredInviteeOptions.length > 0 ? (
                        filteredInviteeOptions.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            disabled={pending}
                            onClick={() => addInvitee(profile.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
                          >
                            <span>
                              <span className="block text-sm font-semibold text-camp-forest">
                                {profile.displayName}
                              </span>
                              <span className="block text-xs font-normal text-slate-500">
                                {profile.email}
                              </span>
                            </span>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-camp-forest">
                              Add
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs font-normal text-slate-500">
                          No matching users available.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                {editingCalendarItem?.invitees && editingCalendarItem.invitees.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-camp-forest/10 bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-camp-moss">
                      Invite status
                    </p>
                    <div className="mt-2 grid gap-2">
                      {editingCalendarItem.invitees.map((invitee) => {
                        const profile = profileById.get(invitee.profileId);

                        return (
                          <div
                            key={invitee.profileId}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="font-semibold text-camp-forest">
                              {profile?.displayName ?? 'Camp user'}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 font-semibold ${getInviteStatusClassName(
                                invitee.status
                              )}`}
                            >
                              {getInviteStatusLabel(invitee.status)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="text-sm font-semibold text-camp-forest">
                Notes
                <textarea
                  value={eventForm.notes}
                  onChange={(event) => updateEventForm({ notes: event.target.value })}
                  rows={4}
                  className="mt-2 w-full resize-y rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                />
              </label>

              <p className="rounded-2xl bg-camp-sky/55 px-4 py-3 text-sm text-camp-forest">
                {dateFormatter.format(eventForm.startsAt)} |{' '}
                {timeFormatter.format(eventForm.startsAt)}-{timeFormatter.format(eventForm.endsAt)}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {eventForm.mode === 'edit' ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={deleteEvent}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-camp-forest/10 bg-camp-sand/35 px-5 py-3 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/60 disabled:cursor-wait disabled:opacity-70"
                >
                  <BucketIcon />
                  Delete
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={() => setEventForm(null)}
                className="rounded-2xl border border-camp-forest/10 bg-white px-5 py-3 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/40 disabled:cursor-wait disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !eventForm.title.trim()}
                className="rounded-2xl bg-camp-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-camp-moss disabled:cursor-wait disabled:opacity-70"
              >
                {pending
                  ? eventForm.mode === 'edit'
                    ? 'Saving...'
                    : 'Creating...'
                  : eventForm.mode === 'edit'
                    ? 'Save changes'
                    : 'Create event'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {rsvpEvent ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-camp-forest/35 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-rsvp-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) {
              setRsvpEvent(null);
            }
          }}
        >
          <div className="w-full max-w-xl rounded-[32px] border border-camp-forest/10 bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-camp-moss">
                  Calendar invite
                </p>
                <h3
                  id="calendar-rsvp-modal-title"
                  className="mt-2 font-serif text-3xl text-camp-forest"
                >
                  {rsvpEvent.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {dateFormatter.format(new Date(rsvpEvent.startsAt))} |{' '}
                  {timeFormatter.format(new Date(rsvpEvent.startsAt))}-
                  {timeFormatter.format(new Date(rsvpEvent.endsAt))}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setRsvpEvent(null)}
                className="rounded-full border border-camp-forest/10 px-3 py-1 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/40 disabled:cursor-wait disabled:opacity-70"
                aria-label="Close invite modal"
              >
                x
              </button>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <p>
                From{' '}
                <span className="font-semibold text-camp-forest">
                  {profileById.get(rsvpEvent.ownerProfileId ?? '')?.displayName ?? 'Camp user'}
                </span>
              </p>
              <div className="grid gap-3 rounded-2xl border border-camp-forest/10 bg-camp-sand/20 p-4">
                <p>
                  <span className="font-semibold text-camp-forest">Location:</span>{' '}
                  {rsvpEvent.location || 'No location provided'}
                </p>
                <p>
                  <span className="font-semibold text-camp-forest">Notes:</span>{' '}
                  {rsvpEvent.notes || 'No notes provided'}
                </p>
                <div>
                  <p className="font-semibold text-camp-forest">Other attendees</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(rsvpEvent.invitees ?? [])
                      .filter((invitee) => invitee.profileId !== currentProfileId)
                      .map((invitee) => {
                        const profile = profileById.get(invitee.profileId);

                        return (
                          <span
                            key={invitee.profileId}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getInviteStatusClassName(
                              invitee.status
                            )}`}
                          >
                            {profile?.displayName ?? 'Camp user'} ·{' '}
                            {getInviteStatusLabel(invitee.status)}
                          </span>
                        );
                      })}
                    {(rsvpEvent.invitees ?? []).filter(
                      (invitee) => invitee.profileId !== currentProfileId
                    ).length === 0 ? (
                      <span className="text-xs text-slate-500">No other invitees yet.</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p
                className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getInviteStatusClassName(
                  rsvpEvent.currentInviteStatus ?? 'pending'
                )}`}
              >
                Current status: {getInviteStatusLabel(rsvpEvent.currentInviteStatus ?? 'pending')}
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={() => respondToInvite('declined')}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-70"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => respondToInvite('accepted')}
                className="rounded-2xl bg-camp-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-camp-moss disabled:cursor-wait disabled:opacity-70"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
