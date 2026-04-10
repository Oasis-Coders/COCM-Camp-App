'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { updateTaskStatus } from './actions';
import { CreateTaskForm } from './create-task-form';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  availableTransitions,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/tasks/task-model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskWithProfile = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  assigned_to: string | null;
  event_id: string | null;
  event: { title: string } | null;
  assigned_to_profile: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  created_by_profile: {
    display_name: string | null;
  } | null;
};

type FilterTab = 'all' | 'mine' | 'active' | 'done';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors = TASK_STATUS_COLORS[status] ?? TASK_STATUS_COLORS.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {TASK_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const colors = TASK_PRIORITY_COLORS[priority] ?? TASK_PRIORITY_COLORS.medium;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}
    >
      {TASK_PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

function SummaryBar({ tasks }: { tasks: TaskWithProfile[] }) {
  const counts: Record<string, number> = {};
  for (const s of TASK_STATUSES) counts[s] = 0;
  for (const t of tasks) {
    if (counts[t.status] !== undefined) counts[t.status]++;
  }

  const pills = TASK_STATUSES.filter((s) => counts[s] > 0);
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((s) => {
        const c = TASK_STATUS_COLORS[s];
        return (
          <span
            key={s}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${c.bg} ${c.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
            {counts[s]} {TASK_STATUS_LABELS[s]}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TaskList({
  tasks,
  currentProfileId,
  isStaff,
  events,
  staffProfiles,
}: {
  tasks: TaskWithProfile[];
  currentProfileId: string | null;
  isStaff: boolean;
  events: { id: string; title: string }[];
  staffProfiles: { id: string; display_name: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'any'>('any');
  const [showCreate, setShowCreate] = useState(false);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    startTransition(() => {
      updateTaskStatus(taskId, newStatus);
    });
  };

  const now = new Date();

  // Hide drafts from non-staff users
  const visibleTasks = isStaff ? tasks : tasks.filter((t) => t.status !== 'draft');

  const filteredTasks = visibleTasks.filter((task) => {
    // Tab filter
    let passesTab = true;
    switch (filter) {
      case 'mine':
        passesTab =
          task.assigned_to_profile?.id === currentProfileId || task.created_by === currentProfileId;
        break;
      case 'active':
        passesTab = !['done', 'cancelled'].includes(task.status);
        break;
      case 'done':
        passesTab = task.status === 'done' || task.status === 'cancelled';
        break;
    }

    // Status dropdown filter
    const passesStatus = statusFilter === 'any' || task.status === statusFilter;

    return passesTab && passesStatus;
  });

  // Compute counts for tab badges
  const myCount = visibleTasks.filter(
    (t) => t.assigned_to_profile?.id === currentProfileId || t.created_by === currentProfileId
  ).length;

  const activeCount = visibleTasks.filter((t) => !['done', 'cancelled'].includes(t.status)).length;

  const overdueCount = visibleTasks.filter(
    (t) => t.due_at && new Date(t.due_at) < now && t.status !== 'done' && t.status !== 'cancelled'
  ).length;

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: visibleTasks.length },
    { key: 'mine', label: 'My Tasks', count: myCount },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'done', label: 'Completed' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary bar */}
      <SummaryBar tasks={visibleTasks} />

      {/* Filter controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-camp-forest text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs ${
                    filter === tab.key ? 'bg-white/20' : 'bg-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'any')}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
          >
            <option value="any">All statuses</option>
            {TASK_STATUSES.filter((s) => isStaff || s !== 'draft').map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          {isStaff && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-full bg-camp-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-camp-forest/90"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          <span className="font-semibold">⚠ {overdueCount} overdue</span>
          {overdueCount === 1 ? ' task needs' : ' tasks need'} attention.
        </div>
      )}

      {/* Task cards */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 p-8 text-center">
            <p className="text-sm text-slate-500">
              {filter === 'mine'
                ? 'No tasks assigned to you.'
                : filter === 'active'
                  ? 'No active tasks — everything is done or cancelled.'
                  : filter === 'done'
                    ? 'No completed tasks yet.'
                    : statusFilter !== 'any'
                      ? `No ${TASK_STATUS_LABELS[statusFilter].toLowerCase()} tasks.`
                      : 'No tasks found.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const status = task.status as TaskStatus;
            const priority = task.priority as TaskPriority;
            const assigneeName = task.assigned_to_profile
              ? (task.assigned_to_profile.display_name ??
                `${task.assigned_to_profile.first_name} ${task.assigned_to_profile.last_name}`)
              : 'Unassigned';

            const isOwn =
              task.assigned_to_profile?.id === currentProfileId ||
              task.created_by === currentProfileId;
            const isOverdue =
              task.due_at &&
              new Date(task.due_at) < now &&
              status !== 'done' &&
              status !== 'cancelled';
            const isTerminal = status === 'done' || status === 'cancelled';
            const transitions = availableTransitions(status);

            return (
              <article
                key={task.id}
                className={`group rounded-[24px] border bg-white/85 p-5 shadow-panel transition-all ${
                  isPending ? 'opacity-50' : ''
                } ${isTerminal ? 'border-slate-200 opacity-70 hover:opacity-100' : 'border-camp-forest/10'} ${
                  isOwn && !isTerminal ? 'ring-1 ring-camp-forest/10' : ''
                }`}
              >
                <div className="flex flex-col gap-4">
                  {/* Top row: title + badges */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={`font-semibold transition-colors hover:underline ${
                            isTerminal
                              ? 'text-slate-500 line-through'
                              : 'text-camp-forest hover:text-camp-forest/80'
                          }`}
                        >
                          {task.title}
                        </Link>
                        {isOwn && !isTerminal && (
                          <span className="rounded-full bg-camp-sky/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-camp-forest">
                            Yours
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={status} />
                      <PriorityBadge priority={priority} />
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      Assignee:{' '}
                      <span className={isOwn ? 'font-semibold text-camp-forest' : ''}>
                        {assigneeName}
                      </span>
                    </span>
                    {task.event && <span>Event: {task.event.title}</span>}
                    {task.due_at && (
                      <span className={isOverdue ? 'font-semibold text-red-600' : ''}>
                        Due: {new Date(task.due_at).toLocaleDateString()}
                        {isOverdue && ' (overdue)'}
                      </span>
                    )}
                    {task.completed_at && (
                      <span className="text-green-600">
                        Completed: {new Date(task.completed_at).toLocaleDateString()}
                      </span>
                    )}
                    {isStaff && task.created_by_profile && (
                      <span className="text-slate-400">
                        Created by: {task.created_by_profile.display_name}
                      </span>
                    )}
                  </div>

                  {/* Transition buttons */}
                  {transitions.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      {transitions.map((target) => {
                        const targetColors = TASK_STATUS_COLORS[target];
                        return (
                          <button
                            key={target}
                            onClick={() => handleStatusChange(task.id, target)}
                            disabled={isPending}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${targetColors.bg} ${targetColors.text} hover:opacity-80 disabled:opacity-40`}
                          >
                            → {TASK_STATUS_LABELS[target]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Create task modal */}
      {showCreate && (
        <CreateTaskForm
          onClose={() => setShowCreate(false)}
          events={events}
          staffProfiles={staffProfiles}
        />
      )}
    </div>
  );
}
