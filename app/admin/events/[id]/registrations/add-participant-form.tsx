'use client';

import { useState, useTransition } from 'react';
import { adminManualRegister } from './actions';

type Profile = {
  id: string;
  displayName: string;
  email: string;
};

type AddParticipantFormProps = {
  eventId: string;
  profiles: Profile[];
  existingUserIds: string[];
};

export function AddParticipantForm({
  eventId,
  profiles,
  existingUserIds,
}: AddParticipantFormProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const existingSet = new Set(existingUserIds);
  const availableProfiles = profiles.filter((p) => !existingSet.has(p.id));
  const filteredProfiles = availableProfiles.filter(
    (p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProfile = profiles.find((p) => p.id === selectedId);

  const handleRegister = () => {
    if (!selectedId) return;
    startTransition(async () => {
      try {
        await adminManualRegister(eventId, selectedId);
        setSelectedId(null);
        setSearch('');
      } catch (e: any) {
        alert('Failed to register: ' + e.message);
      }
    });
  };

  return (
    <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
      <h3 className="mb-3 font-serif text-lg text-camp-forest">Add Participant</h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <label className="mb-1 block text-sm font-medium text-camp-forest" htmlFor="add-user">
            Search user
          </label>
          <input
            id="add-user"
            type="text"
            value={
              selectedProfile ? `${selectedProfile.displayName} (${selectedProfile.email})` : search
            }
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedId(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type a name or email…"
            className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-camp-forest focus:outline-none focus:ring-1 focus:ring-camp-forest"
          />
          {showDropdown && !selectedId && search.length > 0 && filteredProfiles.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {filteredProfiles.slice(0, 10).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-camp-forest/5"
                    onClick={() => {
                      setSelectedId(p.id);
                      setSearch('');
                      setShowDropdown(false);
                    }}
                  >
                    <span className="font-medium">{p.displayName}</span>{' '}
                    <span className="text-slate-500">({p.email})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={handleRegister}
          disabled={!selectedId || isPending}
          className="rounded-full bg-camp-forest px-6 py-2 text-sm font-medium text-white transition hover:bg-camp-forest/90 disabled:opacity-50"
        >
          {isPending ? 'Adding…' : 'Register'}
        </button>
      </div>
    </div>
  );
}
