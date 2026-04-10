import { describe, it, expect } from 'vitest';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  TASK_TRANSITIONS,
  TERMINAL_STATUSES,
  isValidTransition,
  availableTransitions,
  isTaskStatus,
  isTaskPriority,
} from '@/lib/tasks/task-model';

describe('Task Model — Statuses', () => {
  it('defines exactly 6 statuses', () => {
    expect(TASK_STATUSES).toHaveLength(6);
    expect(TASK_STATUSES).toEqual(['draft', 'open', 'in_progress', 'blocked', 'done', 'cancelled']);
  });

  it('every status has a human-readable label', () => {
    for (const status of TASK_STATUSES) {
      expect(TASK_STATUS_LABELS[status]).toBeDefined();
      expect(TASK_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it('every status has colour tokens', () => {
    for (const status of TASK_STATUSES) {
      const colors = TASK_STATUS_COLORS[status];
      expect(colors).toBeDefined();
      expect(colors.bg).toBeDefined();
      expect(colors.text).toBeDefined();
      expect(colors.dot).toBeDefined();
    }
  });
});

describe('Task Model — Priorities', () => {
  it('defines exactly 4 priorities', () => {
    expect(TASK_PRIORITIES).toHaveLength(4);
    expect(TASK_PRIORITIES).toEqual(['low', 'medium', 'high', 'urgent']);
  });

  it('every priority has a label and colours', () => {
    for (const p of TASK_PRIORITIES) {
      expect(TASK_PRIORITY_LABELS[p]).toBeDefined();
      expect(TASK_PRIORITY_COLORS[p]).toBeDefined();
    }
  });
});

describe('Task Model — Transitions', () => {
  it('every status has a transitions entry', () => {
    for (const status of TASK_STATUSES) {
      expect(TASK_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(TASK_TRANSITIONS[status])).toBe(true);
    }
  });

  it('terminal statuses have no outbound transitions', () => {
    for (const status of TERMINAL_STATUSES) {
      expect(TASK_TRANSITIONS[status]).toHaveLength(0);
    }
  });

  it('done and cancelled are the only terminal statuses', () => {
    expect(TERMINAL_STATUSES).toEqual(['done', 'cancelled']);
  });

  it('all transition targets are valid statuses', () => {
    const validSet = new Set(TASK_STATUSES);
    for (const [, targets] of Object.entries(TASK_TRANSITIONS)) {
      for (const target of targets) {
        expect(validSet.has(target)).toBe(true);
      }
    }
  });

  it('isValidTransition returns true for allowed transitions', () => {
    expect(isValidTransition('draft', 'open')).toBe(true);
    expect(isValidTransition('open', 'in_progress')).toBe(true);
    expect(isValidTransition('in_progress', 'blocked')).toBe(true);
    expect(isValidTransition('in_progress', 'done')).toBe(true);
    expect(isValidTransition('blocked', 'in_progress')).toBe(true);
    expect(isValidTransition('open', 'cancelled')).toBe(true);
  });

  it('isValidTransition returns false for illegal transitions', () => {
    expect(isValidTransition('draft', 'in_progress')).toBe(false);
    expect(isValidTransition('draft', 'done')).toBe(false);
    expect(isValidTransition('done', 'open')).toBe(false);
    expect(isValidTransition('cancelled', 'open')).toBe(false);
    expect(isValidTransition('blocked', 'done')).toBe(false);
    expect(isValidTransition('open', 'blocked')).toBe(false);
  });

  it('availableTransitions returns correct targets', () => {
    expect(availableTransitions('draft')).toEqual(['open', 'cancelled']);
    expect(availableTransitions('open')).toEqual(['in_progress', 'done', 'cancelled']);
    expect(availableTransitions('done')).toEqual([]);
  });
});

describe('Task Model — Type Guards', () => {
  it('isTaskStatus correctly identifies valid statuses', () => {
    expect(isTaskStatus('draft')).toBe(true);
    expect(isTaskStatus('open')).toBe(true);
    expect(isTaskStatus('in_progress')).toBe(true);
    expect(isTaskStatus('blocked')).toBe(true);
    expect(isTaskStatus('done')).toBe(true);
    expect(isTaskStatus('cancelled')).toBe(true);
  });

  it('isTaskStatus rejects invalid strings', () => {
    expect(isTaskStatus('todo')).toBe(false);
    expect(isTaskStatus('')).toBe(false);
    expect(isTaskStatus('DONE')).toBe(false);
    expect(isTaskStatus('pending')).toBe(false);
  });

  it('isTaskPriority correctly identifies valid priorities', () => {
    expect(isTaskPriority('low')).toBe(true);
    expect(isTaskPriority('medium')).toBe(true);
    expect(isTaskPriority('high')).toBe(true);
    expect(isTaskPriority('urgent')).toBe(true);
  });

  it('isTaskPriority rejects invalid strings', () => {
    expect(isTaskPriority('critical')).toBe(false);
    expect(isTaskPriority('')).toBe(false);
    expect(isTaskPriority('HIGH')).toBe(false);
  });
});
