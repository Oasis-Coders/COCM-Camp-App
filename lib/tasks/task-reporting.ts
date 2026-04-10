/**
 * Task Reporting — Snapshot Queries
 *
 * Pure functions that compute reporting metrics from a list of tasks.
 * These run on already-fetched data (no DB dependency) so they are
 * fully testable without mocking Supabase.
 *
 * The page-level data fetcher lives in task-queries.ts; this module
 * only does the math.
 */

import type { TaskStatus, TaskPriority } from './task-model';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from './task-model';

// ---------------------------------------------------------------------------
// Input shape — minimal fields needed from a task row
// ---------------------------------------------------------------------------

export type ReportableTask = {
  id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at?: string | null;
};

// ---------------------------------------------------------------------------
// Status breakdown
// ---------------------------------------------------------------------------

export type StatusCount = {
  status: TaskStatus;
  label: string;
  count: number;
};

export function countByStatus(tasks: ReportableTask[]): StatusCount[] {
  const map = new Map<TaskStatus, number>();
  for (const s of TASK_STATUSES) map.set(s, 0);

  for (const t of tasks) {
    const current = map.get(t.status as TaskStatus);
    if (current !== undefined) map.set(t.status as TaskStatus, current + 1);
  }

  return TASK_STATUSES.map((s) => ({
    status: s,
    label: TASK_STATUS_LABELS[s],
    count: map.get(s) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Priority breakdown
// ---------------------------------------------------------------------------

export type PriorityCount = {
  priority: TaskPriority;
  label: string;
  count: number;
};

export function countByPriority(tasks: ReportableTask[]): PriorityCount[] {
  const map = new Map<TaskPriority, number>();
  for (const p of TASK_PRIORITIES) map.set(p, 0);

  for (const t of tasks) {
    const current = map.get(t.priority as TaskPriority);
    if (current !== undefined) map.set(t.priority as TaskPriority, current + 1);
  }

  return TASK_PRIORITIES.map((p) => ({
    priority: p,
    label: TASK_PRIORITY_LABELS[p],
    count: map.get(p) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Overdue tasks
// ---------------------------------------------------------------------------

export function getOverdueTasks(tasks: ReportableTask[], now: Date = new Date()): ReportableTask[] {
  return tasks.filter(
    (t) => t.due_at && new Date(t.due_at) < now && t.status !== 'done' && t.status !== 'cancelled'
  );
}

// ---------------------------------------------------------------------------
// Unassigned active tasks
// ---------------------------------------------------------------------------

export function getUnassignedActiveTasks(tasks: ReportableTask[]): ReportableTask[] {
  return tasks.filter((t) => !t.assigned_to && t.status !== 'done' && t.status !== 'cancelled');
}

// ---------------------------------------------------------------------------
// Completion rate
// ---------------------------------------------------------------------------

export type CompletionRate = {
  total: number;
  completed: number;
  cancelled: number;
  active: number;
  completionPercent: number;
};

export function computeCompletionRate(tasks: ReportableTask[]): CompletionRate {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const cancelled = tasks.filter((t) => t.status === 'cancelled').length;
  const active = total - completed - cancelled;
  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, cancelled, active, completionPercent };
}

// ---------------------------------------------------------------------------
// Assignee workload
// ---------------------------------------------------------------------------

export type AssigneeWorkload = {
  assigneeId: string | null;
  total: number;
  open: number;
  inProgress: number;
  blocked: number;
  done: number;
};

export function countByAssignee(tasks: ReportableTask[]): AssigneeWorkload[] {
  const map = new Map<
    string | null,
    { total: number; open: number; inProgress: number; blocked: number; done: number }
  >();

  for (const t of tasks) {
    const key = t.assigned_to;
    if (!map.has(key)) {
      map.set(key, { total: 0, open: 0, inProgress: 0, blocked: 0, done: 0 });
    }
    const entry = map.get(key)!;
    entry.total++;
    if (t.status === 'open' || t.status === 'draft') entry.open++;
    else if (t.status === 'in_progress') entry.inProgress++;
    else if (t.status === 'blocked') entry.blocked++;
    else if (t.status === 'done') entry.done++;
  }

  return Array.from(map.entries())
    .map(([assigneeId, counts]) => ({ assigneeId, ...counts }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Full snapshot — all metrics in one call
// ---------------------------------------------------------------------------

export type TaskReportSnapshot = {
  statusBreakdown: StatusCount[];
  priorityBreakdown: PriorityCount[];
  completion: CompletionRate;
  overdueCount: number;
  unassignedActiveCount: number;
  assigneeWorkload: AssigneeWorkload[];
};

export function buildReportSnapshot(
  tasks: ReportableTask[],
  now: Date = new Date()
): TaskReportSnapshot {
  return {
    statusBreakdown: countByStatus(tasks),
    priorityBreakdown: countByPriority(tasks),
    completion: computeCompletionRate(tasks),
    overdueCount: getOverdueTasks(tasks, now).length,
    unassignedActiveCount: getUnassignedActiveTasks(tasks).length,
    assigneeWorkload: countByAssignee(tasks),
  };
}
