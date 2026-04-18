'use client';

import { useTransition } from 'react';
import { toggleCheckIn } from './actions';

export type EventRegistrationWithProfile = {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  user: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
  } | null;
  event: {
    title: string;
  } | null;
  isCheckedIn: boolean;
};

export function CheckInList({ registrations }: { registrations: EventRegistrationWithProfile[] }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (eventId: string, userId: string, currentlyCheckedIn: boolean) => {
    startTransition(() => {
      toggleCheckIn(eventId, userId, !currentlyCheckedIn);
    });
  };

  return (
    <div className="grid gap-4">
      {registrations.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-camp-forest/10 bg-white/60 p-8 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-3 font-serif text-lg text-camp-forest">No active registrations</p>
          <p className="mt-1 text-sm text-slate-500">
            There are no confirmed registrations to check in.
          </p>
        </div>
      ) : (
        registrations.map((reg) => {
          const name = reg.user
            ? (reg.user.display_name ?? `${reg.user.first_name} ${reg.user.last_name}`)
            : 'Unknown Participant';

          return (
            <article
              key={reg.id}
              className={`flex flex-col justify-between rounded-[24px] border border-camp-forest/10 p-5 shadow-panel transition-opacity sm:flex-row sm:items-center ${isPending ? 'opacity-50' : ''} ${reg.isCheckedIn ? 'bg-camp-forest/5' : 'bg-white/85'}`}
            >
              <div>
                <h3 className="font-semibold text-camp-forest">{name}</h3>
                <p className="mb-2 text-sm text-slate-500 sm:mb-0">{reg.user?.email}</p>
                <div className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {reg.event?.title}
                </div>
              </div>
              <div className="mt-4 flex shrink-0 sm:mt-0">
                <button
                  onClick={() => handleToggle(reg.event_id, reg.user_id, reg.isCheckedIn)}
                  disabled={isPending}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:w-auto ${
                    reg.isCheckedIn
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-camp-forest text-white hover:bg-camp-forest/90'
                  }`}
                >
                  {reg.isCheckedIn ? 'Undo Check-in' : 'Check In'}
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
