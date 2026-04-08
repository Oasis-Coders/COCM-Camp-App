'use client';

import { useTransition } from 'react';
import { registerForEvent, cancelRegistration } from '../actions';

type RegistrationButtonProps = {
  eventId: string;
  currentStatus: 'registered' | 'waitlisted' | 'cancelled' | null;
};

export function RegistrationButton({ eventId, currentStatus }: RegistrationButtonProps) {
  const [isPending, startTransition] = useTransition();

  const isRegistered = currentStatus === 'registered' || currentStatus === 'waitlisted';

  const handleClick = () => {
    startTransition(async () => {
      if (isRegistered) {
        await cancelRegistration(eventId);
      } else {
        await registerForEvent(eventId);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
        isPending
          ? 'cursor-wait opacity-60'
          : isRegistered
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-camp-forest text-white hover:bg-camp-forest/90'
      }`}
    >
      {isPending ? 'Processing…' : isRegistered ? 'Cancel Registration' : 'Register for Event'}
    </button>
  );
}
