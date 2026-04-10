'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { updateTaskStatus } from '@/app/tasks/actions';
import type { TaskWithProfile } from '@/app/tasks/task-list';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  availableTransitions,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/tasks/task-model';

export function TaskDetail({
  task,
  isStaff,
  currentProfileId,
}: {
  task: TaskWithProfile;
  isStaff: boolean;
  currentProfileId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const status = task.status as TaskStatus;
  const priority = task.priority as TaskPriority;
  const statusColors = TASK_STATUS_COLORS[status];
  const priorityColors = TASK_PRIORITY_COLORS[priority];
  const transitions = availableTransitions(status);

  const isOwn =
    task.assigned_to_profile?.id === currentProfileId || task.created_by === currentProfileId;
  const assigneeName = task.assigned_to_profile
    ? (task.assigned_to_profile.display_name ??
      `${task.assigned_to_profile.first_name} ${task.assigned_to_profile.last_name}`)
    : 'Unassigned';

  const isOverdue =
    task.due_at &&
    new Date(task.due_at) < new Date() &&
    status !== 'done' &&
    status !== 'cancelled';

  const handleStatusChange = (newStatus: string) => {
    startTransition(() => {
      updateTaskStatus(task.id, newStatus);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-camp-forest"
      >
        ← Back to tasks
      </Link>

      {/* Main card */}
      <div
        className={`rounded-[28px] border bg-white/90 p-6 shadow-panel ${
          isPending ? 'opacity-50' : ''
        } border-camp-forest/10`}
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusColors.bg} ${statusColors.text}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusColors.dot}`} />
                {TASK_STATUS_LABELS[status]}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityColors.bg} ${priorityColors.text}`}
              >
                {TASK_PRIORITY_LABELS[priority]}
              </span>
              {isOwn && (
                <span className="rounded-full bg-camp-sky/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-camp-forest">
                  Yours
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {task.description}
            </p>
          </div>
        )}

        {/* Details grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailField label="Assignee" value={assigneeName} highlight={isOwn} />
          {task.event && <DetailField label="Event" value={task.event.title} />}
          {task.due_at && (
            <DetailField
              label="Due Date"
              value={new Date(task.due_at).toLocaleString()}
              alert={!!isOverdue}
            />
          )}
          {task.completed_at && (
            <DetailField
              label="Completed"
              value={new Date(task.completed_at).toLocaleString()}
              success
            />
          )}
          {isStaff && task.created_by_profile && (
            <DetailField label="Created By" value={task.created_by_profile.display_name ?? '—'} />
          )}
        </div>

        {/* Transition actions */}
        {transitions.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Actions
            </h4>
            <div className="flex flex-wrap gap-3">
              {transitions.map((target) => {
                const c = TASK_STATUS_COLORS[target];
                return (
                  <button
                    key={target}
                    onClick={() => handleStatusChange(target)}
                    disabled={isPending}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${c.bg} ${c.text} hover:opacity-80 disabled:opacity-40`}
                  >
                    Move to {TASK_STATUS_LABELS[target]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail field helper
// ---------------------------------------------------------------------------

function DetailField({
  label,
  value,
  highlight,
  alert: isAlert,
  success,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  alert?: boolean;
  success?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={`mt-1 text-sm font-medium ${
          isAlert
            ? 'text-red-600'
            : success
              ? 'text-green-600'
              : highlight
                ? 'text-camp-forest'
                : 'text-slate-700'
        }`}
      >
        {value}
        {isAlert && ' (overdue)'}
      </dd>
    </div>
  );
}
