/**
 * app/events/[slug]/registration-button.tsx  (Client Component)
 *
 * Renders one of three states based on the user's current registration status:
 *
 *   1. Mandatory attendee  →  Info text (no cancel allowed)
 *   2. NOT registered / cancelled  →  A <Link> to /events/[slug]/register (the full form)
 *   3. Already registered / waitlisted  →  A "Cancel Registration" button that
 *      calls the cancelRegistration() server action directly (no page navigation needed)
 *
 * The cancel path optimistically triggers a transition so the button disables
 * while the server action is pending.
 */
'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { cancelRegistration } from '../actions';

type RegistrationButtonProps = {
  eventId: string;
  eventSlug: string;
  currentStatus: 'registered' | 'waitlisted' | 'cancelled' | null;
  isMandatory?: boolean;
};

export function RegistrationButton({
  eventId,
  eventSlug,
  currentStatus,
  isMandatory = false,
}: RegistrationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const isRegistered = currentStatus === 'registered' || currentStatus === 'waitlisted';

  const handleCancel = () => {
    startTransition(async () => {
      await cancelRegistration(eventId);
    });
  };

  // Mandatory attendees cannot cancel their registration
  if (isMandatory && isRegistered) {
    return (
      <div className="w-full rounded-full bg-blue-50 px-6 py-3 text-center text-sm font-semibold text-blue-700">
        Mandatory — cannot be cancelled
      </div>
    );
  }

  if (isRegistered) {
    return (
      <button
        onClick={handleCancel}
        disabled={isPending}
        className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
          isPending ? 'cursor-wait opacity-60' : 'bg-red-50 text-red-600 hover:bg-red-100'
        }`}
      >
        {isPending ? 'Processing…' : 'Cancel Registration'}
      </button>
    );
  }

  return (
    <Link
      href={`/events/${eventSlug}/register`}
      className="inline-block w-full rounded-xl bg-camp-ember px-6 py-3 text-center text-sm font-semibold text-white shadow-ember-glow transition-all hover:bg-camp-ember-dark"
    >
      Begin Registration
    </Link>
  );
}
