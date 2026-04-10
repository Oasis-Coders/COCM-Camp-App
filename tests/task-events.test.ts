import { describe, it, expect } from 'vitest';
import {
  TASK_EVENT_NAMES,
  resolveRecipients,
  eventSummary,
  type TaskNotificationEvent,
} from '@/lib/notifications/task-events';

// ---------------------------------------------------------------------------
// Event name registry
// ---------------------------------------------------------------------------

describe('Task Event Names', () => {
  it('defines exactly 9 event names', () => {
    expect(TASK_EVENT_NAMES).toHaveLength(9);
  });

  it('every event name starts with "task."', () => {
    for (const name of TASK_EVENT_NAMES) {
      expect(name.startsWith('task.')).toBe(true);
    }
  });

  it('includes all expected events', () => {
    expect(TASK_EVENT_NAMES).toContain('task.created');
    expect(TASK_EVENT_NAMES).toContain('task.assigned');
    expect(TASK_EVENT_NAMES).toContain('task.unassigned');
    expect(TASK_EVENT_NAMES).toContain('task.status_changed');
    expect(TASK_EVENT_NAMES).toContain('task.completed');
    expect(TASK_EVENT_NAMES).toContain('task.reopened');
    expect(TASK_EVENT_NAMES).toContain('task.updated');
    expect(TASK_EVENT_NAMES).toContain('task.deleted');
    expect(TASK_EVENT_NAMES).toContain('task.overdue');
  });
});

// ---------------------------------------------------------------------------
// Recipient resolution
// ---------------------------------------------------------------------------

describe('resolveRecipients', () => {
  const actor = 'actor-001';
  const assignee = 'assignee-001';
  const creator = 'creator-001';
  const prevAssignee = 'prev-assignee-001';

  it('task.created → notifies assignee, not actor', () => {
    const event: TaskNotificationEvent = {
      name: 'task.created',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: assignee,
        status: 'draft',
        priority: 'medium',
      },
    };

    const result = resolveRecipients(event);
    expect(result).toContain(assignee);
    expect(result).not.toContain(actor);
  });

  it('task.created without assignee → empty recipients', () => {
    const event: TaskNotificationEvent = {
      name: 'task.created',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: null,
        status: 'open',
        priority: 'high',
      },
    };

    const result = resolveRecipients(event);
    expect(result).toEqual([]);
  });

  it('task.created where actor IS the assignee → no self-notify', () => {
    const event: TaskNotificationEvent = {
      name: 'task.created',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: actor, // self-assigned
        status: 'draft',
        priority: 'medium',
      },
    };

    const result = resolveRecipients(event);
    expect(result).toEqual([]);
  });

  it('task.assigned → notifies new assignee', () => {
    const event: TaskNotificationEvent = {
      name: 'task.assigned',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: assignee,
        previousAssigneeProfileId: null,
      },
    };

    const result = resolveRecipients(event);
    expect(result).toContain(assignee);
    expect(result).not.toContain(actor);
  });

  it('task.assigned with previous assignee → notifies both', () => {
    const event: TaskNotificationEvent = {
      name: 'task.assigned',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: assignee,
        previousAssigneeProfileId: prevAssignee,
      },
    };

    const result = resolveRecipients(event);
    expect(result).toContain(assignee);
    expect(result).toContain(prevAssignee);
    expect(result).not.toContain(actor);
  });

  it('task.unassigned → notifies previous assignee', () => {
    const event: TaskNotificationEvent = {
      name: 'task.unassigned',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        previousAssigneeProfileId: prevAssignee,
      },
    };

    const result = resolveRecipients(event);
    expect(result).toContain(prevAssignee);
    expect(result).not.toContain(actor);
  });

  it('task.status_changed → notifies assignee and creator from context', () => {
    const event: TaskNotificationEvent = {
      name: 'task.status_changed',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        fromStatus: 'open',
        toStatus: 'in_progress',
      },
    };

    const result = resolveRecipients(event, {
      assigneeProfileId: assignee,
      creatorProfileId: creator,
    });
    expect(result).toContain(assignee);
    expect(result).toContain(creator);
    expect(result).not.toContain(actor);
  });

  it('task.status_changed by assignee → only notifies creator, not self', () => {
    const event: TaskNotificationEvent = {
      name: 'task.status_changed',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: assignee, // assignee is the actor
        fromStatus: 'open',
        toStatus: 'in_progress',
      },
    };

    const result = resolveRecipients(event, {
      assigneeProfileId: assignee,
      creatorProfileId: creator,
    });
    expect(result).toContain(creator);
    expect(result).not.toContain(assignee);
  });

  it('task.completed → notifies assignee and creator', () => {
    const event: TaskNotificationEvent = {
      name: 'task.completed',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: assignee,
      },
    };

    const result = resolveRecipients(event, { creatorProfileId: creator });
    expect(result).toContain(assignee);
    expect(result).toContain(creator);
    expect(result).not.toContain(actor);
  });

  it('task.deleted → notifies assignee', () => {
    const event: TaskNotificationEvent = {
      name: 'task.deleted',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        assigneeProfileId: assignee,
      },
    };

    const result = resolveRecipients(event);
    expect(result).toContain(assignee);
    expect(result).not.toContain(actor);
  });

  it('task.overdue (system event) → notifies assignee', () => {
    const event: TaskNotificationEvent = {
      name: 'task.overdue',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        assigneeProfileId: assignee,
        dueAt: '2026-04-09T00:00:00Z',
      },
    };

    const result = resolveRecipients(event);
    expect(result).toContain(assignee);
  });

  it('task.overdue without assignee → empty', () => {
    const event: TaskNotificationEvent = {
      name: 'task.overdue',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        assigneeProfileId: null,
        dueAt: '2026-04-09T00:00:00Z',
      },
    };

    const result = resolveRecipients(event);
    expect(result).toEqual([]);
  });

  it('task.updated → notifies assignee from context', () => {
    const event: TaskNotificationEvent = {
      name: 'task.updated',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        changes: [{ field: 'priority', oldValue: 'low', newValue: 'urgent' }],
      },
    };

    const result = resolveRecipients(event, { assigneeProfileId: assignee });
    expect(result).toContain(assignee);
    expect(result).not.toContain(actor);
  });

  it('deduplicates recipients', () => {
    // When creator and assignee are the same person
    const sameProfile = 'same-001';
    const event: TaskNotificationEvent = {
      name: 'task.status_changed',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: actor,
        fromStatus: 'open',
        toStatus: 'in_progress',
      },
    };

    const result = resolveRecipients(event, {
      assigneeProfileId: sameProfile,
      creatorProfileId: sameProfile,
    });
    // Should appear only once
    expect(result.filter((r) => r === sameProfile)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Event summary
// ---------------------------------------------------------------------------

describe('eventSummary', () => {
  it('produces human-readable summaries for each event type', () => {
    const events: TaskNotificationEvent[] = [
      {
        name: 'task.created',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
          status: 'draft',
          priority: 'medium',
        },
      },
      {
        name: 'task.assigned',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
          assigneeProfileId: 'b',
        },
      },
      {
        name: 'task.unassigned',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
          previousAssigneeProfileId: 'b',
        },
      },
      {
        name: 'task.status_changed',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
          fromStatus: 'open',
          toStatus: 'in_progress',
        },
      },
      {
        name: 'task.completed',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
        },
      },
      {
        name: 'task.reopened',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
          fromStatus: 'done',
          toStatus: 'open',
        },
      },
      {
        name: 'task.updated',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
          changes: [],
        },
      },
      {
        name: 'task.deleted',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          actorProfileId: 'a',
        },
      },
      {
        name: 'task.overdue',
        payload: {
          taskId: 't1',
          taskTitle: 'Setup tables',
          dueAt: '2026-04-09T00:00:00Z',
        },
      },
    ];

    for (const event of events) {
      const summary = eventSummary(event);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      // Should include the task title
      expect(summary).toContain('Setup tables');
    }
  });

  it('task.status_changed includes from and to status', () => {
    const summary = eventSummary({
      name: 'task.status_changed',
      payload: {
        taskId: 't1',
        taskTitle: 'Test',
        actorProfileId: 'a',
        fromStatus: 'open',
        toStatus: 'in_progress',
      },
    });
    expect(summary).toContain('open');
    expect(summary).toContain('in_progress');
  });
});
