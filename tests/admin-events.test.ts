/**
 * tests/admin-events.test.ts
 *
 * Automated tests for Event Admin features introduced in Milestone 1 & 2.
 * Focuses on pure utility logic extracted from the server actions:
 *   - Calculating available promotion spots on capacity increases
 *   - Safely appending admin cancellation reasons to complex JSON payloads
 */

import { describe, expect, it } from 'vitest';
import {
  calculatePromotionAvailableSpots,
  appendAdminCancellationReason,
} from '@/lib/events/admin-utils';

// ---------------------------------------------------------------------------
// 1. Capacity Increase Logic
//    Covers: `updateEvent` in `app/admin/events/actions.ts`
// ---------------------------------------------------------------------------
describe('admin events — calculatePromotionAvailableSpots', () => {
  it('returns 0 when waitlist is completely empty', () => {
    // Capacity jumped from 20 -> 50, registered = 20, but nobody is waiting
    expect(calculatePromotionAvailableSpots(50, 20, 0)).toBe(0);
    expect(calculatePromotionAvailableSpots(null, 20, 0)).toBe(0);
  });

  it('promotes the entire waitlist if the new capacity is set to unlimited (null)', () => {
    // 5 people waiting, admin sets capacity to blank/unlimited
    expect(calculatePromotionAvailableSpots(null, 10, 5)).toBe(5);
    expect(calculatePromotionAvailableSpots(null, 0, 100)).toBe(100);
  });

  it('returns 0 if the newly specified capacity is less than or equal to current registrations', () => {
    // Admin accidentally/intentionally shrinks capacity from 50 -> 30, but there are already 40 registered
    expect(calculatePromotionAvailableSpots(30, 40, 15)).toBe(0);
    // Capacity unchanged (e.g. 50 -> 50)
    expect(calculatePromotionAvailableSpots(50, 50, 5)).toBe(0);
  });

  it('calculates the exact amount of promotions when enough people are on the waitlist', () => {
    // Capacity raised 10 -> 20. 10 spots open. 15 people are waiting. It should promote exactly 10.
    expect(calculatePromotionAvailableSpots(20, 10, 15)).toBe(10);
  });

  it('promotes only the waitlisted number if the newly available spots exceed the waitlist length', () => {
    // Capacity raised 10 -> 50. 40 spots open. Only 5 people are waiting. It should promote exactly 5.
    expect(calculatePromotionAvailableSpots(50, 10, 5)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// 2. Admin Cancellation Notes Integrity
//    Covers: `adminCancelRegistration` in `app/admin/events/[id]/registrations/actions.ts`
// ---------------------------------------------------------------------------
describe('admin events — appendAdminCancellationReason', () => {
  it('creates a fresh JSON payload if the user had zero existing notes', () => {
    const result = appendAdminCancellationReason(null, 'No show');
    const parsed = JSON.parse(result);
    // Should be valid JSON containing only the cancellation reason
    expect(parsed).toEqual({ admin_cancellation_reason: 'No show' });

    // Same behavior for undefined or empty string
    expect(JSON.parse(appendAdminCancellationReason(undefined, 'Payment Failed'))).toEqual({
      admin_cancellation_reason: 'Payment Failed',
    });
    expect(JSON.parse(appendAdminCancellationReason('', 'Requested refund'))).toEqual({
      admin_cancellation_reason: 'Requested refund',
    });
  });

  it('safely appends the reason to an existing valid complex JSON object without data loss', () => {
    const initialNotes = JSON.stringify({
      t_shirt_size: 'L',
      dietary_needs: 'Vegetarian',
      chinese_name: '张三',
    });

    const result = appendAdminCancellationReason(initialNotes, 'Double booked');
    const parsed = JSON.parse(result);

    // Initial properties should survive
    expect(parsed.t_shirt_size).toBe('L');
    expect(parsed.dietary_needs).toBe('Vegetarian');
    expect(parsed.chinese_name).toBe('张三');
    // New property must exist
    expect(parsed.admin_cancellation_reason).toBe('Double booked');
  });

  it('wraps malformed JSON or pure string notes into an object to prevent loss', () => {
    const plainString = 'I have a wheat allergy but I forgot to mention it.';

    const result = appendAdminCancellationReason(plainString, 'Duplicate registration');
    const parsed = JSON.parse(result);

    // Old plain string should be mapped to `raw_note`
    expect(parsed.raw_note).toBe(plainString);
    expect(parsed.admin_cancellation_reason).toBe('Duplicate registration');
  });

  it('wraps JSON arrays into an object to preserve the schema expectation', () => {
    // If somehow a note was technically valid JSON but was an array instead of standard schema dict
    const arrayJson = '["Note 1", "Note 2"]';

    const result = appendAdminCancellationReason(arrayJson, 'Testing schema limits');
    const parsed = JSON.parse(result);

    // Expect the original string to be safely encased in `raw_note`
    // instead of attempting to blindly assign a property to an array
    expect(parsed.raw_note).toBe(arrayJson);
    expect(parsed.admin_cancellation_reason).toBe('Testing schema limits');
  });

  it('handles JSON numbers/booleans gracefully', () => {
    const boolJson = 'true';

    const result = appendAdminCancellationReason(boolJson, 'Invalid payload fix');
    const parsed = JSON.parse(result);

    expect(parsed.raw_note).toBe(boolJson);
    expect(parsed.admin_cancellation_reason).toBe('Invalid payload fix');
  });
});
