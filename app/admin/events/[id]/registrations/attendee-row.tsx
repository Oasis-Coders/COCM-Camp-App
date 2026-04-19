'use client';

import { useTransition } from 'react';
import { adminForcePromoteWaitlist, adminCancelRegistration, adminManualRegister } from './actions';

export function AttendeeRow({ eventId, attendee }: { eventId: string; attendee: any }) {
  const [isPending, startTransition] = useTransition();

  const handleForcePromote = () => {
    if (confirm('Force promote this user to Registered? This bypasses capacity limits.')) {
      startTransition(async () => {
        try {
          await adminForcePromoteWaitlist(eventId, attendee.user_id || attendee.profiles?.id);
        } catch (e: any) {
          alert('Failed to promote: ' + e.message);
        }
      });
    }
  };

  const handleCancel = () => {
    const reason = prompt('Reason for manual cancellation: (optional)');
    if (reason !== null) {
      startTransition(async () => {
        try {
          await adminCancelRegistration(eventId, attendee.user_id || attendee.profiles?.id, reason);
        } catch (e: any) {
          alert('Failed to cancel: ' + e.message);
        }
      });
    }
  };

  const handleReRegister = () => {
    if (confirm('Re-register this user for the event?')) {
      startTransition(async () => {
        try {
          await adminManualRegister(eventId, attendee.user_id || attendee.profiles?.id);
        } catch (e: any) {
          alert('Failed to re-register: ' + e.message);
        }
      });
    }
  };

  let parsedNotes: any = null;
  if (attendee.notes) {
    try {
      parsedNotes = JSON.parse(attendee.notes);
    } catch {
      // not JSON
    }
  }

  return (
    <div className="p-4">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h3 className="font-semibold text-camp-forest">
            {attendee.profiles?.first_name || ''} {attendee.profiles?.last_name || ''}
            {!attendee.profiles?.first_name &&
              !attendee.profiles?.last_name &&
              attendee.profiles?.display_name}
            {attendee.is_mandatory && (
              <span className="bg-camp-forest/8 ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-camp-forest">
                Mandatory
              </span>
            )}
          </h3>
          <p className="text-sm text-camp-moss">{attendee.profiles?.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-right text-xs text-camp-moss">
          <span>{new Date(attendee.registered_at).toLocaleDateString()}</span>

          {attendee.status === 'waitlisted' && (
            <button
              onClick={handleForcePromote}
              disabled={isPending}
              className="rounded-md border border-camp-forest bg-white px-2 py-1 font-medium text-camp-forest transition hover:bg-camp-forest/5 disabled:opacity-50"
            >
              Force Promote
            </button>
          )}

          {attendee.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-md border border-red-200 bg-white px-2 py-1 font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}

          {attendee.status === 'cancelled' && (
            <button
              onClick={handleReRegister}
              disabled={isPending}
              className="rounded-md border border-camp-forest bg-white px-2 py-1 font-medium text-camp-forest transition hover:bg-camp-forest/5 disabled:opacity-50"
            >
              Re-register
            </button>
          )}
        </div>
      </div>

      {attendee.notes && !parsedNotes && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-camp-moss">
          <strong>Raw Notes:</strong> {attendee.notes}
        </div>
      )}

      {parsedNotes && (
        <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-camp-moss md:grid-cols-2">
          {Object.entries(parsedNotes).map(([key, value]) => {
            if (!value) return null; // skip empty
            // Format keys slightly better (chinese_name -> Chinese Name)
            const formattedKey = key
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            return (
              <div key={key}>
                <span className="font-semibold">{formattedKey}:</span> {String(value)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
