'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createEvent, updateEvent, deleteEvent } from './actions';

type Event = {
  id: string;
  title: string;
  slug: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
};

type EventFormProps = {
  event?: Event | null; // Provide event to edit, omit to create
};

export function AdminEventForm({ event }: EventFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEditing = !!event;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateEvent(event!.id, formData);
        } else {
          await createEvent(formData);
        }
      } catch (error) {
        console.error('Failed to submit event:', error);
        alert(error instanceof Error ? error.message : 'An error occurred');
      }
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      startTransition(async () => {
        try {
          await deleteEvent(event!.id);
        } catch (error) {
          console.error('Failed to delete event:', error);
          alert(error instanceof Error ? error.message : 'An error occurred');
        }
      });
    }
  };

  // Fix timezone issue by slicing to YYYY-MM-DDTHH:MM that input[type="datetime-local"] expects
  const formatDatetimeForInput = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    // Adjust to local timezone for the input field to display correctly without shifting hours
    const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(d.getTime() - tzoffset).toISOString().slice(0, -1);
    return localISOTime.slice(0, 16); // "YYYY-MM-DDTHH:MM"
  };

  return (
    <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
      <form action={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="title">
            Event Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            defaultValue={event?.title}
            required
            className="w-full rounded-md border border-slate-300 p-2 focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="slug">
            Slug (URL identifier)
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            defaultValue={event?.slug}
            required
            className="w-full rounded-md border border-slate-300 p-2 focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="location">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            defaultValue={event?.location || ''}
            className="w-full rounded-md border border-slate-300 p-2 focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="starts_at">
            Start Date & Time
          </label>
          <input
            type="datetime-local"
            id="starts_at"
            name="starts_at"
            defaultValue={formatDatetimeForInput(event?.starts_at)}
            required
            className="w-full rounded-md border border-slate-300 p-2 focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="ends_at">
            End Date & Time
          </label>
          <input
            type="datetime-local"
            id="ends_at"
            name="ends_at"
            defaultValue={formatDatetimeForInput(event?.ends_at)}
            required
            className="w-full rounded-md border border-slate-300 p-2 focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="capacity">
            Capacity (Blank for unlimited)
          </label>
          <input
            type="number"
            id="capacity"
            name="capacity"
            min="1"
            defaultValue={event?.capacity ?? ''}
            className="w-full rounded-md border border-slate-300 p-2 focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-camp-forest px-6 py-2 text-sm font-medium text-white transition hover:bg-camp-forest/90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-full border border-red-200 bg-red-50 px-6 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            >
              Delete Event
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
