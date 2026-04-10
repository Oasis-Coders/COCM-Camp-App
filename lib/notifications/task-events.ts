/**
 * Task Notification Event Definitions
 *
 * Defines every event that can trigger a task-related notification.
 * Each event carries a typed payload describing what happened and who
 * should be notified. Delivery is not handled here — this module only
 * defines the *what* and *who* so a future delivery layer (email, push,
 * in-app) can subscribe to these events.
 *
 * Import from this file to stay consistent across the codebase.
 */

import type { TaskStatus, TaskPriority } from '@/lib/tasks/task-model';

// ---------------------------------------------------------------------------
// Event names (string union)
// ---------------------------------------------------------------------------

export const TASK_EVENT_NAMES = [
  'task.created',
  'task.assigned',
  'task.unassigned',
  'task.status_changed',
  'task.completed',
  'task.reopened',
  'task.updated',
  'task.deleted',
  'task.overdue',
] as const;

export type TaskEventName = (typeof TASK_EVENT_NAMES)[number];

// ---------------------------------------------------------------------------
// Shared context that every event carries
// ---------------------------------------------------------------------------

export type TaskRef = {
  taskId: string;
  taskTitle: string;
  eventId?: string | null;
};

export type ActorRef = {
  actorProfileId: string;
};

// ---------------------------------------------------------------------------
// Per-event payloads
// ---------------------------------------------------------------------------

export type TaskCreatedPayload = TaskRef &
  ActorRef & {
    assigneeProfileId?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
  };

export type TaskAssignedPayload = TaskRef &
  ActorRef & {
    assigneeProfileId: string;
    previousAssigneeProfileId?: string | null;
  };

export type TaskUnassignedPayload = TaskRef &
  ActorRef & {
    previousAssigneeProfileId: string;
  };

export type TaskStatusChangedPayload = TaskRef &
  ActorRef & {
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
  };

export type TaskCompletedPayload = TaskRef &
  ActorRef & {
    assigneeProfileId?: string | null;
  };

export type TaskReopenedPayload = TaskRef &
  ActorRef & {
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
  };

export type TaskUpdatedPayload = TaskRef &
  ActorRef & {
    changes: {
      field: string;
      oldValue?: string | null;
      newValue?: string | null;
    }[];
  };

export type TaskDeletedPayload = TaskRef &
  ActorRef & {
    assigneeProfileId?: string | null;
  };

export type TaskOverduePayload = TaskRef & {
  assigneeProfileId?: string | null;
  dueAt: string;
};

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type TaskNotificationEvent =
  | { name: 'task.created'; payload: TaskCreatedPayload }
  | { name: 'task.assigned'; payload: TaskAssignedPayload }
  | { name: 'task.unassigned'; payload: TaskUnassignedPayload }
  | { name: 'task.status_changed'; payload: TaskStatusChangedPayload }
  | { name: 'task.completed'; payload: TaskCompletedPayload }
  | { name: 'task.reopened'; payload: TaskReopenedPayload }
  | { name: 'task.updated'; payload: TaskUpdatedPayload }
  | { name: 'task.deleted'; payload: TaskDeletedPayload }
  | { name: 'task.overdue'; payload: TaskOverduePayload };

// ---------------------------------------------------------------------------
// Recipient resolution
// ---------------------------------------------------------------------------

/**
 * Given a notification event, return the profile IDs that should receive it.
 *
 * Rules:
 * - The actor (person who triggered the event) is NEVER notified about
 *   their own action.
 * - task.assigned      → new assignee
 * - task.unassigned    → previous assignee
 * - task.created       → assignee (if set)
 * - task.status_changed → assignee (if exists in task)
 * - task.completed     → assignee + creator get notified
 * - task.reopened      → assignee
 * - task.updated       → assignee
 * - task.deleted       → assignee
 * - task.overdue       → assignee (no actor — system-triggered)
 *
 * The caller may optionally enrich with additional recipients
 * (e.g. all admins, task creator).
 */
export function resolveRecipients(
  event: TaskNotificationEvent,
  context?: { creatorProfileId?: string; assigneeProfileId?: string | null }
): string[] {
  const recipients = new Set<string>();
  const actorId = 'actorProfileId' in event.payload ? event.payload.actorProfileId : null;

  switch (event.name) {
    case 'task.created':
      if (event.payload.assigneeProfileId) {
        recipients.add(event.payload.assigneeProfileId);
      }
      break;

    case 'task.assigned':
      recipients.add(event.payload.assigneeProfileId);
      // Also notify previous assignee that they were unassigned
      if (event.payload.previousAssigneeProfileId) {
        recipients.add(event.payload.previousAssigneeProfileId);
      }
      break;

    case 'task.unassigned':
      recipients.add(event.payload.previousAssigneeProfileId);
      break;

    case 'task.status_changed':
      if (context?.assigneeProfileId) {
        recipients.add(context.assigneeProfileId);
      }
      if (context?.creatorProfileId) {
        recipients.add(context.creatorProfileId);
      }
      break;

    case 'task.completed':
      if (event.payload.assigneeProfileId) {
        recipients.add(event.payload.assigneeProfileId);
      }
      if (context?.creatorProfileId) {
        recipients.add(context.creatorProfileId);
      }
      break;

    case 'task.reopened':
      if (context?.assigneeProfileId) {
        recipients.add(context.assigneeProfileId);
      }
      break;

    case 'task.updated':
      if (context?.assigneeProfileId) {
        recipients.add(context.assigneeProfileId);
      }
      break;

    case 'task.deleted':
      if (event.payload.assigneeProfileId) {
        recipients.add(event.payload.assigneeProfileId);
      }
      break;

    case 'task.overdue':
      if (event.payload.assigneeProfileId) {
        recipients.add(event.payload.assigneeProfileId);
      }
      break;
  }

  // Never notify the actor about their own action
  if (actorId) {
    recipients.delete(actorId);
  }

  return Array.from(recipients);
}

// ---------------------------------------------------------------------------
// Human-readable summary (for future in-app display / email subjects)
// ---------------------------------------------------------------------------

export function eventSummary(event: TaskNotificationEvent): string {
  const title = event.payload.taskTitle;

  switch (event.name) {
    case 'task.created':
      return `New task created: "${title}"`;
    case 'task.assigned':
      return `You were assigned to: "${title}"`;
    case 'task.unassigned':
      return `You were unassigned from: "${title}"`;
    case 'task.status_changed':
      return `Task "${title}" moved from ${event.payload.fromStatus} to ${event.payload.toStatus}`;
    case 'task.completed':
      return `Task "${title}" was completed`;
    case 'task.reopened':
      return `Task "${title}" was reopened`;
    case 'task.updated':
      return `Task "${title}" was updated`;
    case 'task.deleted':
      return `Task "${title}" was deleted`;
    case 'task.overdue':
      return `Task "${title}" is overdue`;
  }
}
