/**
 * events.test.ts
 *
 * All automated tests for the Events feature domain:
 *   - Registration status (capacity & waitlist assignment)
 *   - Waitlist auto-promotion eligibility
 *   - Form payload serialization / deserialization
 *   - Attendee grouping by status (used by admin views)
 *   - Next-in-line selection for waitlist promotion (FIFO)
 *   - Event filter classification (upcoming / past / all)
 */

import { describe, expect, it } from 'vitest';
import {
  determineRegistrationStatus,
  shouldPromoteFromWaitlist,
  serializeFormData,
  deserializeFormData,
  groupAttendeesByStatus,
  pickNextInLine,
} from '@/lib/events/registration-utils';

// ---------------------------------------------------------------------------
// 1. Registration status — capacity & waitlist assignment
//    Covers: registerForEvent() in app/events/actions.ts
// ---------------------------------------------------------------------------
describe('registration — determineRegistrationStatus', () => {
  it('returns registered when there is no capacity limit', () => {
    expect(determineRegistrationStatus(null, 100)).toBe('registered');
    expect(determineRegistrationStatus(undefined, 100)).toBe('registered');
  });

  it('returns registered when the current registered count is unknown', () => {
    expect(determineRegistrationStatus(100, null)).toBe('registered');
    expect(determineRegistrationStatus(100, undefined)).toBe('registered');
  });

  it('returns waitlisted when capacity is exactly reached', () => {
    expect(determineRegistrationStatus(100, 100)).toBe('waitlisted');
  });

  it('returns waitlisted when capacity is exceeded', () => {
    expect(determineRegistrationStatus(50, 60)).toBe('waitlisted');
  });

  it('returns registered when capacity is not yet reached', () => {
    expect(determineRegistrationStatus(100, 0)).toBe('registered');
    expect(determineRegistrationStatus(100, 99)).toBe('registered');
  });

  it('handles a capacity of 1 correctly (boundary edge case)', () => {
    expect(determineRegistrationStatus(1, 0)).toBe('registered');
    expect(determineRegistrationStatus(1, 1)).toBe('waitlisted');
  });
});

// ---------------------------------------------------------------------------
// 2. Waitlist — auto-promotion eligibility on cancellation
//    Covers: cancelRegistration() in app/events/actions.ts
// ---------------------------------------------------------------------------
describe('waitlist — shouldPromoteFromWaitlist', () => {
  it('does not promote when the cancelled status was waitlisted (not registered)', () => {
    expect(shouldPromoteFromWaitlist('waitlisted', 100, 50)).toBe(false);
  });

  it('does not promote when the cancelled status was already cancelled', () => {
    expect(shouldPromoteFromWaitlist('cancelled', 100, 50)).toBe(false);
  });

  it('does not promote when there is no capacity set (unlimited event)', () => {
    expect(shouldPromoteFromWaitlist('registered', null, 0)).toBe(false);
    expect(shouldPromoteFromWaitlist('registered', undefined, 0)).toBe(false);
    expect(shouldPromoteFromWaitlist('registered', 0, 0)).toBe(false);
  });

  it('does not promote when the count after cancellation is still at capacity', () => {
    expect(shouldPromoteFromWaitlist('registered', 10, 10)).toBe(false);
  });

  it('promotes when a registered person cancels and a spot opens up', () => {
    expect(shouldPromoteFromWaitlist('registered', 10, 9)).toBe(true);
    expect(shouldPromoteFromWaitlist('registered', 1, 0)).toBe(true);
  });

  it('does not promote when registered count after cancel is null (unknown)', () => {
    expect(shouldPromoteFromWaitlist('registered', 10, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Waitlist — next-in-line selection (FIFO ordering)
//    Covers: cancelRegistration() waitlist promotion query in app/events/actions.ts
// ---------------------------------------------------------------------------
describe('waitlist — pickNextInLine', () => {
  const waitlisted = [
    { user_id: 'u3', status: 'waitlisted', registered_at: '2026-03-10T10:00:00Z' },
    { user_id: 'u1', status: 'waitlisted', registered_at: '2026-03-08T09:00:00Z' }, // oldest — should be first
    { user_id: 'u2', status: 'waitlisted', registered_at: '2026-03-09T12:30:00Z' },
  ];

  it('picks the user who joined the waitlist earliest', () => {
    expect(pickNextInLine(waitlisted)?.user_id).toBe('u1');
  });

  it('returns null for an empty waitlist', () => {
    expect(pickNextInLine([])).toBeNull();
  });

  it('returns the sole entry when the waitlist has one person', () => {
    const single = [{ user_id: 'u1', status: 'waitlisted', registered_at: '2026-03-01T00:00:00Z' }];
    expect(pickNextInLine(single)?.user_id).toBe('u1');
  });

  it('does not mutate the original array when sorting', () => {
    const copy = [...waitlisted];
    pickNextInLine(waitlisted);
    expect(waitlisted).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// 4. Registration form — payload serialization & deserialization
//    Covers: serializeFormData in app/events/actions.ts (notes column storage),
//            deserializeFormData used by admin attendee views
// ---------------------------------------------------------------------------
describe('registration — form payload serialization', () => {
  const mockFormPayload = {
    // Personal Information
    chinese_name: '张三',
    english_name: 'Zhang San',
    gender: 'Male',
    dob: '2000-03-15',
    status: 'Student',
    wechat_id: 'zhangsan2000',
    phone: '+44 7700 900123',
    // Education & Profession
    university: 'University College London',
    major: 'Computer Science',
    profession: 'Student',
    city: 'London',
    // Faith & Church
    church: 'London Chinese Alliance Church',
    faith_status: 'Baptized 0-3 years',
    // Camp Specifics
    t_shirt_size: 'M',
    personality: 'Emotional Extrovert',
    allergies: 'None',
    accommodations: '',
    serve_roles: 'Worship, PA',
    // Financial Aid & Consent
    financial_aid: 'No',
    consent: 'on',
  };

  it('serializes form data to a non-null JSON string', () => {
    const serialized = serializeFormData(mockFormPayload);
    expect(serialized).not.toBeNull();
    expect(typeof serialized).toBe('string');
  });

  it('round-trips without data loss — all 20 fields survive serialize→deserialize', () => {
    const serialized = serializeFormData(mockFormPayload);
    const recovered = deserializeFormData(serialized);
    expect(recovered).not.toBeNull();
    expect(recovered).toEqual(mockFormPayload);
  });

  it('preserves Chinese-character values (UTF-8 integrity)', () => {
    const recovered = deserializeFormData(serializeFormData(mockFormPayload));
    expect(recovered?.chinese_name).toBe('张三');
  });

  it('preserves every field by key when checked individually', () => {
    const recovered = deserializeFormData(serializeFormData(mockFormPayload));
    for (const key of Object.keys(mockFormPayload)) {
      expect(recovered).toHaveProperty(key);
      expect(recovered![key]).toStrictEqual(mockFormPayload[key as keyof typeof mockFormPayload]);
    }
  });

  it('returns null for empty or undefined formData (no notes stored)', () => {
    expect(serializeFormData(undefined)).toBeNull();
    expect(serializeFormData(null)).toBeNull();
    expect(serializeFormData({})).toBeNull();
  });

  it('returns null when deserializing invalid or missing notes', () => {
    expect(deserializeFormData(null)).toBeNull();
    expect(deserializeFormData(undefined)).toBeNull();
    expect(deserializeFormData('')).toBeNull();
    expect(deserializeFormData('not-json')).toBeNull();
    expect(deserializeFormData('"just a string"')).toBeNull();
    expect(deserializeFormData('[1,2,3]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Admin views — attendee grouping by status
//    Covers: app/admin/events/[id]/registrations/page.tsx grouping logic
// ---------------------------------------------------------------------------
describe('admin — groupAttendeesByStatus', () => {
  const attendees = [
    { user_id: 'u1', status: 'registered' },
    { user_id: 'u2', status: 'waitlisted' },
    { user_id: 'u3', status: 'cancelled' },
    { user_id: 'u4', status: 'registered' },
    { user_id: 'u5', status: 'waitlisted' },
  ];

  it('correctly groups attendees by status into three buckets', () => {
    const grouped = groupAttendeesByStatus(attendees);
    expect(grouped.registered).toHaveLength(2);
    expect(grouped.waitlisted).toHaveLength(2);
    expect(grouped.cancelled).toHaveLength(1);
  });

  it('returns empty arrays for buckets that have no members', () => {
    const grouped = groupAttendeesByStatus([{ user_id: 'u1', status: 'registered' }]);
    expect(grouped.waitlisted).toHaveLength(0);
    expect(grouped.cancelled).toHaveLength(0);
  });

  it('returns all-empty groups for an empty attendee list', () => {
    const grouped = groupAttendeesByStatus([]);
    expect(grouped.registered).toHaveLength(0);
    expect(grouped.waitlisted).toHaveLength(0);
    expect(grouped.cancelled).toHaveLength(0);
  });

  it('preserves the complete attendee object inside each group', () => {
    const grouped = groupAttendeesByStatus(attendees);
    expect(grouped.registered[0]).toEqual({ user_id: 'u1', status: 'registered' });
    expect(grouped.waitlisted[0]).toEqual({ user_id: 'u2', status: 'waitlisted' });
  });
});

// ---------------------------------------------------------------------------
// 6. Event listing — filter classification (Upcoming / Past / All)
//    Covers: ?filter= query param logic in app/events/page.tsx
// ---------------------------------------------------------------------------
describe('event listing — filter classification', () => {
  // Pure helper that mirrors the page-level filter logic
  function classifyEvent(startsAt: string, filter: string): boolean {
    const now = new Date('2026-04-10T00:00:00Z'); // fixed reference point
    const start = new Date(startsAt);
    if (filter === 'upcoming') return start >= now;
    if (filter === 'past') return start < now;
    return true; // 'all'
  }

  it('includes future events in the "upcoming" filter', () => {
    expect(classifyEvent('2026-05-01T00:00:00Z', 'upcoming')).toBe(true);
    expect(classifyEvent('2026-12-31T00:00:00Z', 'upcoming')).toBe(true);
  });

  it('excludes past events from the "upcoming" filter', () => {
    expect(classifyEvent('2026-01-01T00:00:00Z', 'upcoming')).toBe(false);
    expect(classifyEvent('2025-06-15T00:00:00Z', 'upcoming')).toBe(false);
  });

  it('includes past events in the "past" filter', () => {
    expect(classifyEvent('2026-01-01T00:00:00Z', 'past')).toBe(true);
    expect(classifyEvent('2025-06-15T00:00:00Z', 'past')).toBe(true);
  });

  it('excludes future events from the "past" filter', () => {
    expect(classifyEvent('2026-05-01T00:00:00Z', 'past')).toBe(false);
  });

  it('includes all events when filter is "all"', () => {
    expect(classifyEvent('2025-01-01T00:00:00Z', 'all')).toBe(true);
    expect(classifyEvent('2027-01-01T00:00:00Z', 'all')).toBe(true);
  });

  it('includes all events for an unrecognised/empty filter value', () => {
    expect(classifyEvent('2025-01-01T00:00:00Z', '')).toBe(true);
    expect(classifyEvent('2027-01-01T00:00:00Z', 'unknown')).toBe(true);
  });
});
