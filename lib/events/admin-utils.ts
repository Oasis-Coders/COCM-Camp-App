/**
 * lib/events/admin-utils.ts
 *
 * Pure utility functions for event admin operations to allow 100% test coverage
 * without needing Supabase database mocks.
 */

/**
 * Calculates precisely how many waitlisted spots can be promoted
 * when an admin increases an event's capacity.
 *
 * @param newCapacity The new capacity ceiling (null means unlimited).
 * @param registeredCount The current number of confirmed registered users.
 * @param waitlistLength The total number of users currently on the waitlist.
 * @returns The exact integer of how many users should be promoted.
 */
export function calculatePromotionAvailableSpots(
  newCapacity: number | null,
  registeredCount: number,
  waitlistLength: number
): number {
  if (waitlistLength === 0) return 0;

  // If new capacity is unlimited, we can promote everyone on the waitlist
  if (newCapacity === null) {
    return waitlistLength;
  }

  // If the new capacity is still less than or equal to current registrations,
  // we cannot promote anyone. (e.g. shrinking capacity or negligible increase)
  if (newCapacity <= registeredCount) {
    return 0;
  }

  // Otherwise, we have a finite number of new spots opening up
  const spotsAvailable = newCapacity - registeredCount;

  // We can only promote up to the number of people actually waiting
  return Math.min(spotsAvailable, waitlistLength);
}

/**
 * Safely appends an admin cancellation reason into the user's existing JSON notes payload.
 *
 * Requirements:
 *  - If notes is null/undefined, creates a fresh JSON object.
 *  - If notes is valid JSON, appends `admin_cancellation_reason`.
 *  - If notes is an invalid JSON string (e.g. old plain text), wraps it
 *    into `{ raw_note: string, admin_cancellation_reason: string }`.
 *
 * @param existingNotes The raw notes string from the database (JSON or plain text)
 * @param reason The physical reason for cancellation provided by the admin
 * @returns Serialized JSON string ready to be stored in the DB
 */
export function appendAdminCancellationReason(
  existingNotes: string | null | undefined,
  reason: string
): string {
  let parsedNotes: Record<string, unknown> = {};

  if (existingNotes) {
    try {
      const parsed = JSON.parse(existingNotes);
      // Double check it's an object, not an array or a pure string/number that somehow parsed
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        parsedNotes = parsed;
      } else {
        parsedNotes = { raw_note: existingNotes };
      }
    } catch {
      // It's a standard string or malformed JSON
      parsedNotes = { raw_note: existingNotes };
    }
  }

  // Append the new reason safely
  parsedNotes.admin_cancellation_reason = reason;

  return JSON.stringify(parsedNotes);
}
