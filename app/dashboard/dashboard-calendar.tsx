'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';

import { createPersonalCalendarEvent, updatePersonalCalendarEvent } from './calendar-actions';

export type CalendarProfile = {
  id: string;
  displayName: string;
  email: string;
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
    top,
    height: Math.min(height, 100 - top),
  };
}

function buildDashboardHref(week: Date, profileId: string) {
  return `/dashboard?week=${toDateInputValue(week)}&profile=${profileId}`;
}

function getSelectedOptions(select: HTMLSelectElement) {
  return Array.from(select.selectedOptions, (option) => option.value);
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
    setEventForm({
      mode: 'create',
      title: 'Personal event',
      startsAt,
      endsAt,
      locationType: 'physical',
      location: '',
      notes: '',
      inviteeProfileIds: [],
    });
  }

  function openEditEvent(item: CalendarItem) {
    if (
      !canEdit ||
      item.kind !== 'personal' ||
      !item.sourceId ||
      item.ownerProfileId !== currentProfileId ||
      pending
    ) {
      return;
    }

    setMessage(null);
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
  }

  function updateEventForm(patch: Partial<CalendarEventFormState>) {
    setEventForm((current) => (current ? { ...current, ...patch } : current));
  }

  function saveEventForm() {
    if (!eventForm) {
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
              className="rounded-2xl border border-camp-forest/10 bg-camp-sand/45 px-4 py-3 text-center text-sm font-semibold text-camp-forest transition hover:bg-camp-sand"
              aria-label="Previous week"
            >
              &lt;-
            </Link>
            <Link
              href={buildDashboardHref(nextWeek, selectedProfileId)}
              className="rounded-2xl bg-camp-forest px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-camp-moss"
              aria-label="Next week"
            >
              -&gt;
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

                {items
                  .map((item) => ({ item, layout: getItemLayout(item, weekStartDate) }))
                  .filter((entry) => entry.layout?.dayIndex === dayIndex)
                  .map(({ item, layout }) => {
                    if (!layout) {
                      return null;
                    }

                    const itemClassName = `absolute left-2 right-2 z-10 overflow-hidden rounded-2xl border px-3 py-2 text-left text-xs shadow-sm transition ${
                      item.kind === 'event'
                        ? 'border-camp-forest/15 bg-camp-forest text-white'
                        : 'border-camp-moss/20 bg-camp-sky text-camp-forest'
                    } ${
                      item.kind === 'personal' &&
                      canEdit &&
                      item.ownerProfileId === currentProfileId
                        ? 'hover:border-camp-forest/35 hover:bg-white'
                        : ''
                    }`;
                    const itemStyle = {
                      top: `${layout.top}%`,
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
                      </>
                    );

                    if (item.kind === 'personal') {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!canEdit || item.ownerProfileId !== currentProfileId || pending}
                          className={itemClassName}
                          style={itemStyle}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => openEditEvent(item)}
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

              <label className="text-sm font-semibold text-camp-forest">
                Invitees
                <select
                  multiple
                  value={eventForm.inviteeProfileIds}
                  onChange={(event) =>
                    updateEventForm({ inviteeProfileIds: getSelectedOptions(event.currentTarget) })
                  }
                  className="mt-2 h-36 w-full rounded-2xl border border-camp-forest/10 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-camp-moss focus:ring-2 focus:ring-camp-sky"
                >
                  {inviteeOptions.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName} - {profile.email}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs font-normal text-slate-500">
                  Hold Ctrl or Shift to choose more than one person.
                </span>
              </label>

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
                disabled={pending}
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
    </section>
  );
}
