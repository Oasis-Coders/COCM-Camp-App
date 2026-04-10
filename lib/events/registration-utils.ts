export function determineRegistrationStatus(
  capacity: number | null | undefined,
  currentRegisteredCount: number | null | undefined
): 'registered' | 'waitlisted' {
  if (capacity === null || capacity === undefined) {
    return 'registered';
  }

  if (currentRegisteredCount === null || currentRegisteredCount === undefined) {
    return 'registered';
  }

  if (currentRegisteredCount >= capacity) {
    return 'waitlisted';
  }

  return 'registered';
}

/**
 * Determines if a cancellation should trigger waitlist auto-promotion.
 * Returns true only if the cancelled registration was previously 'registered'
 * and there is now a free spot (registered count is below capacity).
 */
export function shouldPromoteFromWaitlist(
  cancelledStatus: string,
  capacity: number | null | undefined,
  registeredCountAfterCancel: number | null
): boolean {
  if (cancelledStatus !== 'registered') return false;
  if (!capacity) return false;
  if (registeredCountAfterCancel === null) return false;
  return registeredCountAfterCancel < capacity;
}

/**
 * Serializes registration form data into a JSON string for storage.
 * Returns null if formData is empty or undefined.
 */
export function serializeFormData(
  formData: Record<string, unknown> | undefined | null
): string | null {
  if (!formData || Object.keys(formData).length === 0) return null;
  return JSON.stringify(formData);
}

/**
 * Deserializes a stored JSON notes string back into form data.
 * Returns null if the string is invalid JSON or null/undefined.
 */
export function deserializeFormData(
  notes: string | null | undefined
): Record<string, unknown> | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Groups a flat list of event_registration records by their status.
 */
export function groupAttendeesByStatus<T extends { status: string }>(
  attendees: T[]
): {
  registered: T[];
  waitlisted: T[];
  cancelled: T[];
} {
  return {
    registered: attendees.filter((a) => a.status === 'registered'),
    waitlisted: attendees.filter((a) => a.status === 'waitlisted'),
    cancelled: attendees.filter((a) => a.status === 'cancelled'),
  };
}

/**
 * Picks the next person for waitlist promotion, by earliest registration date.
 */
export function pickNextInLine<T extends { registered_at: string; user_id: string }>(
  waitlisted: T[]
): T | null {
  if (waitlisted.length === 0) return null;
  return [...waitlisted].sort(
    (a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
  )[0];
}
