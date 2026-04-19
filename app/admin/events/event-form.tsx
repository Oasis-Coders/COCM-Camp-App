'use client';

import { useState, useTransition } from 'react';
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

type Profile = {
  id: string;
  displayName: string;
  email: string;
};

type EventFormProps = {
  event?: Event | null; // Provide event to edit, omit to create
  profiles?: Profile[]; // Available profiles for mandatory participant selection
  mandatoryAttendeeIds?: string[]; // Currently mandatory attendee profile IDs (edit mode)
};

export function AdminEventForm({
  event,
  profiles = [],
  mandatoryAttendeeIds = [],
}: EventFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [selectedMandatory, setSelectedMandatory] = useState<string[]>(mandatoryAttendeeIds);
  const [searchQuery, setSearchQuery] = useState('');

  const isEditing = !!event;

  const handleSubmit = (formData: FormData) => {
    // Inject mandatory participants as JSON into the form data
    formData.set('mandatory_participants', JSON.stringify(selectedMandatory));

    startTransition(async () => {
      try {
        let res;
        if (isEditing) {
          res = await updateEvent(event!.id, formData);
        } else {
          res = await createEvent(formData);
        }

        if (res?.error) {
          alert(res.error);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'NEXT_REDIRECT' || (error as any).digest?.startsWith('NEXT_REDIRECT'))
        ) {
          throw error;
        }
        console.error('Failed to submit event:', error);
        alert(error instanceof Error ? error.message : 'An error occurred');
      }
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      startTransition(async () => {
        try {
          const res = await deleteEvent(event!.id);
          if (res?.error) {
            alert(res.error);
          }
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message === 'NEXT_REDIRECT' ||
              (error as any).digest?.startsWith('NEXT_REDIRECT'))
          ) {
            throw error;
          }
          console.error('Failed to delete event:', error);
          alert(error instanceof Error ? error.message : 'An error occurred');
        }
      });
    }
  };

  const toggleMandatory = (profileId: string) => {
    setSelectedMandatory((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const removeMandatory = (profileId: string) => {
    setSelectedMandatory((prev) => prev.filter((id) => id !== profileId));
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

  const filteredProfiles = profiles.filter((profile) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      profile.displayName.toLowerCase().includes(query) ||
      profile.email.toLowerCase().includes(query)
    );
  });

  const selectedProfiles = profiles.filter((p) => selectedMandatory.includes(p.id));

  return (
    <div className="rounded-card border border-camp-forest/10 bg-white p-6 shadow-card">
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

        {/* Mandatory Participants Section */}
        <div>
          <label className="mb-1 block text-sm font-medium text-camp-forest">
            Mandatory Participants
          </label>
          <p className="mb-2 text-xs text-camp-moss">
            These users will be automatically registered and cannot cancel.
          </p>

          {/* Selected mandatory participants */}
          {selectedProfiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2" data-testid="mandatory-chips">
              {selectedProfiles.map((profile) => (
                <span
                  key={profile.id}
                  className="bg-camp-forest/8 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-camp-forest"
                >
                  {profile.displayName}
                  <button
                    type="button"
                    onClick={() => removeMandatory(profile.id)}
                    className="ml-1 text-camp-forest/60 hover:text-camp-forest"
                    aria-label={`Remove ${profile.displayName}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search and select */}
          {profiles.length > 0 && (
            <div>
              <input
                type="text"
                placeholder="Search participants by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2 w-full rounded-md border border-slate-300 p-2 text-sm focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
                data-testid="mandatory-search"
              />
              <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((profile) => (
                    <label
                      key={profile.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMandatory.includes(profile.id)}
                        onChange={() => toggleMandatory(profile.id)}
                        className="rounded border-slate-300 text-camp-forest focus:ring-camp-forest"
                      />
                      <span className="text-camp-moss">{profile.displayName}</span>
                      <span className="text-xs text-slate-400">{profile.email}</span>
                    </label>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-slate-400">No matching participants.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-camp-ember px-6 py-2 text-sm font-semibold text-white shadow-ember-glow transition-all hover:bg-camp-ember-dark disabled:opacity-50"
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
