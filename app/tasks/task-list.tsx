'use client';

import { useTransition, useState } from 'react';
import { updateTaskStatus } from './actions';
import { CreateTaskForm } from './create-task-form';
import {
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

type FilterTab = 'all' | 'mine' | 'overdue' | 'blocked';

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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TaskList({
  tasks,
  currentUserId,
  isStaff,
  events,
  staffProfiles,
}: {
  tasks: TaskWithProfile[];
  currentUserId: string | undefined;
  isStaff: boolean;
  events: { id: string; title: string }[];
  staffProfiles: { id: string; display_name: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showCreate, setShowCreate] = useState(false);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    startTransition(() => {
      updateTaskStatus(taskId, newStatus);
    });
  };

  const now = new Date();
  const filteredTasks = tasks.filter((task) => {
    switch (filter) {
      case 'mine':
        return task.assigned_to_profile !== null;
      case 'overdue':
        return (
          task.due_at &&
          new Date(task.due_at) < now &&
          task.status !== 'done' &&
          task.status !== 'cancelled'
        );
      case 'blocked':
        return task.status === 'blocked';
      default:
        return true;
    }
  });

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'My Tasks' },
    {
      key: 'overdue',
      label: 'Overdue',
      count: tasks.filter(
        (t) =>
          t.due_at && new Date(t.due_at) < now && t.status !== 'done' && t.status !== 'cancelled'
      ).length,
    },
    {
      key: 'blocked',
      label: 'Blocked',
      count: tasks.filter((t) => t.status === 'blocked').length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar: filter tabs + New Task button */}
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
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isStaff && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-camp-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-camp-forest/90"
          >
            + New Task
          </button>
        )}
      </div>

      {/* Task cards */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/60 p-8 text-center">
            <p className="text-sm text-slate-500">
              {filter === 'all'
                ? 'No tasks found.'
                : `No ${filter === 'mine' ? 'assigned' : filter} tasks.`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const status = task.status as TaskStatus;
            const priority = task.priority as TaskPriority;
            const owner = task.assigned_to_profile
              ? (task.assigned_to_profile.display_name ??
                `${task.assigned_to_profile.first_name} ${task.assigned_to_profile.last_name}`)
              : 'Unassigned';
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
                className={`rounded-[24px] border bg-white/85 p-5 shadow-panel transition-opacity ${
                  isPending ? 'opacity-50' : ''
                } ${isTerminal ? 'border-slate-200 opacity-70 hover:opacity-100' : 'border-camp-forest/10'}`}
              >
                <div className="flex flex-col gap-4">
                  {/* Top row: title + badges */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`font-semibold ${
                          isTerminal ? 'text-slate-500 line-through' : 'text-camp-forest'
                        }`}
                      >
                        {task.title}
                      </h3>
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
                    <span>Assignee: {owner}</span>
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
