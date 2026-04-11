/**
 * Task Workflow Model
 *
 * Central type definitions for the task lifecycle.
 * Every component, server action, and test should import from here
 * rather than defining its own status/priority strings.
 */

// ---------------------------------------------------------------------------
// Statuses
// ---------------------------------------------------------------------------

export const TASK_STATUSES = [
  'draft',
  'open',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

/** Colour tokens used by the UI for status badges and accents. */
export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  open: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  in_progress: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  blocked: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  done: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: {
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    dot: 'bg-slate-300',
  },
};

/** Terminal statuses — no outbound transitions allowed. */
export const TERMINAL_STATUSES: TaskStatus[] = ['done', 'cancelled'];

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Valid status transitions.
 *
 * Key = current status, Value = array of statuses it can move to.
 * An empty array means the status is terminal.
 */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['in_progress', 'done', 'cancelled'],
  in_progress: ['blocked', 'done', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  done: [],
  cancelled: [],
};

/** Returns true if the transition from `from` to `to` is allowed. */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Returns the set of statuses that `current` can move to. */
export function availableTransitions(current: TaskStatus): readonly TaskStatus[] {
  return TASK_TRANSITIONS[current] ?? [];
}

// ---------------------------------------------------------------------------
// Priorities
// ---------------------------------------------------------------------------

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700' },
  urgent: { bg: 'bg-red-50', text: 'text-red-700' },
};

// ---------------------------------------------------------------------------
// Type guard helpers
// ---------------------------------------------------------------------------

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}
