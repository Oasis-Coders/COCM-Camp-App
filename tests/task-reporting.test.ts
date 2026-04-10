import { describe, it, expect } from 'vitest';
import {
  countByStatus,
  countByPriority,
  getOverdueTasks,
  getUnassignedActiveTasks,
  computeCompletionRate,
  countByAssignee,
  buildReportSnapshot,
  type ReportableTask,
} from '@/lib/tasks/task-reporting';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date('2026-04-10T12:00:00Z');

const tasks: ReportableTask[] = [
  {
    id: '1',
    status: 'draft',
    priority: 'low',
    assigned_to: null,
    due_at: null,
    completed_at: null,
  },
  {
    id: '2',
    status: 'open',
    priority: 'medium',
    assigned_to: 'alice',
    due_at: '2026-04-15T00:00:00Z',
    completed_at: null,
  },
  {
    id: '3',
    status: 'open',
    priority: 'high',
    assigned_to: 'bob',
    due_at: '2026-04-08T00:00:00Z',
    completed_at: null,
  },
  {
    id: '4',
    status: 'in_progress',
    priority: 'urgent',
    assigned_to: 'alice',
    due_at: '2026-04-20T00:00:00Z',
    completed_at: null,
  },
  {
    id: '5',
    status: 'in_progress',
    priority: 'medium',
    assigned_to: 'bob',
    due_at: '2026-04-05T00:00:00Z',
    completed_at: null,
  },
  {
    id: '6',
    status: 'blocked',
    priority: 'high',
    assigned_to: 'alice',
    due_at: null,
    completed_at: null,
  },
  {
    id: '7',
    status: 'done',
    priority: 'medium',
    assigned_to: 'alice',
    due_at: '2026-04-01T00:00:00Z',
    completed_at: '2026-04-02T00:00:00Z',
  },
  {
    id: '8',
    status: 'done',
    priority: 'low',
    assigned_to: 'bob',
    due_at: null,
    completed_at: '2026-04-09T00:00:00Z',
  },
  {
    id: '9',
    status: 'cancelled',
    priority: 'low',
    assigned_to: null,
    due_at: null,
    completed_at: null,
  },
  {
    id: '10',
    status: 'open',
    priority: 'medium',
    assigned_to: null,
    due_at: null,
    completed_at: null,
  },
];

// ---------------------------------------------------------------------------
// countByStatus
// ---------------------------------------------------------------------------

describe('countByStatus', () => {
  it('counts each status correctly', () => {
    const result = countByStatus(tasks);
    const find = (s: string) => result.find((r) => r.status === s)!;

    expect(find('draft').count).toBe(1);
    expect(find('open').count).toBe(3);
    expect(find('in_progress').count).toBe(2);
    expect(find('blocked').count).toBe(1);
    expect(find('done').count).toBe(2);
    expect(find('cancelled').count).toBe(1);
  });

  it('returns all 6 statuses even when some have zero count', () => {
    const result = countByStatus([]);
    expect(result).toHaveLength(6);
    result.forEach((r) => expect(r.count).toBe(0));
  });

  it('includes human-readable labels', () => {
    const result = countByStatus(tasks);
    expect(result.find((r) => r.status === 'in_progress')!.label).toBe('In Progress');
  });
});

// ---------------------------------------------------------------------------
// countByPriority
// ---------------------------------------------------------------------------

describe('countByPriority', () => {
  it('counts each priority correctly', () => {
    const result = countByPriority(tasks);
    const find = (p: string) => result.find((r) => r.priority === p)!;

    expect(find('low').count).toBe(3);
    expect(find('medium').count).toBe(4);
    expect(find('high').count).toBe(2);
    expect(find('urgent').count).toBe(1);
  });

  it('returns all 4 priorities for empty input', () => {
    const result = countByPriority([]);
    expect(result).toHaveLength(4);
    result.forEach((r) => expect(r.count).toBe(0));
  });
});

// ---------------------------------------------------------------------------
// getOverdueTasks
// ---------------------------------------------------------------------------

describe('getOverdueTasks', () => {
  it('finds tasks past their due date that are not done or cancelled', () => {
    const overdue = getOverdueTasks(tasks, now);
    // Task 3: open, due 2026-04-08 (past)
    // Task 5: in_progress, due 2026-04-05 (past)
    // Task 7: done, due 2026-04-01 — excluded (done)
    expect(overdue).toHaveLength(2);
    expect(overdue.map((t) => t.id).sort()).toEqual(['3', '5']);
  });

  it('returns empty when no tasks are overdue', () => {
    const future = new Date('2025-01-01T00:00:00Z');
    expect(getOverdueTasks(tasks, future)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getUnassignedActiveTasks
// ---------------------------------------------------------------------------

describe('getUnassignedActiveTasks', () => {
  it('finds active tasks with no assignee', () => {
    const result = getUnassignedActiveTasks(tasks);
    // Task 1: draft, unassigned — active
    // Task 9: cancelled, unassigned — excluded
    // Task 10: open, unassigned — active
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id).sort()).toEqual(['1', '10']);
  });
});

// ---------------------------------------------------------------------------
// computeCompletionRate
// ---------------------------------------------------------------------------

describe('computeCompletionRate', () => {
  it('computes correct numbers', () => {
    const rate = computeCompletionRate(tasks);
    expect(rate.total).toBe(10);
    expect(rate.completed).toBe(2);
    expect(rate.cancelled).toBe(1);
    expect(rate.active).toBe(7);
    expect(rate.completionPercent).toBe(20);
  });

  it('handles empty task list', () => {
    const rate = computeCompletionRate([]);
    expect(rate.total).toBe(0);
    expect(rate.completionPercent).toBe(0);
  });

  it('handles 100% completion', () => {
    const allDone: ReportableTask[] = [
      {
        id: '1',
        status: 'done',
        priority: 'low',
        assigned_to: 'a',
        due_at: null,
        completed_at: '2026-01-01',
      },
      {
        id: '2',
        status: 'done',
        priority: 'low',
        assigned_to: 'b',
        due_at: null,
        completed_at: '2026-01-02',
      },
    ];
    const rate = computeCompletionRate(allDone);
    expect(rate.completionPercent).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// countByAssignee
// ---------------------------------------------------------------------------

describe('countByAssignee', () => {
  it('groups tasks by assignee with correct status buckets', () => {
    const result = countByAssignee(tasks);

    const alice = result.find((r) => r.assigneeId === 'alice')!;
    expect(alice.total).toBe(4);
    expect(alice.open).toBe(1); // task 2
    expect(alice.inProgress).toBe(1); // task 4
    expect(alice.blocked).toBe(1); // task 6
    expect(alice.done).toBe(1); // task 7

    const bob = result.find((r) => r.assigneeId === 'bob')!;
    expect(bob.total).toBe(3);

    const unassigned = result.find((r) => r.assigneeId === null)!;
    expect(unassigned.total).toBe(3); // tasks 1, 9, 10
  });

  it('sorts by total descending', () => {
    const result = countByAssignee(tasks);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].total).toBeGreaterThanOrEqual(result[i].total);
    }
  });
});

// ---------------------------------------------------------------------------
// buildReportSnapshot
// ---------------------------------------------------------------------------

describe('buildReportSnapshot', () => {
  it('assembles all metrics in one call', () => {
    const snapshot = buildReportSnapshot(tasks, now);

    expect(snapshot.statusBreakdown).toHaveLength(6);
    expect(snapshot.priorityBreakdown).toHaveLength(4);
    expect(snapshot.completion.total).toBe(10);
    expect(snapshot.overdueCount).toBe(2);
    expect(snapshot.unassignedActiveCount).toBe(2);
    expect(snapshot.assigneeWorkload.length).toBeGreaterThan(0);
  });

  it('works with empty tasks', () => {
    const snapshot = buildReportSnapshot([], now);
    expect(snapshot.completion.total).toBe(0);
    expect(snapshot.overdueCount).toBe(0);
    expect(snapshot.unassignedActiveCount).toBe(0);
    expect(snapshot.assigneeWorkload).toHaveLength(0);
  });
});
