'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateTaskStatus, assignTask, updateTaskDetails, deleteTask } from '@/app/tasks/actions';
import type { TaskWithProfile } from '@/app/tasks/task-list';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITIES,
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
  events,
  profiles,
}: {
  task: TaskWithProfile;
  isStaff: boolean;
  currentProfileId: string | null;
  events: { id: string; title: string }[];
  profiles: { id: string; display_name: string | null }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = task.status as TaskStatus;
  const priority = task.priority as TaskPriority;
  const statusColors = TASK_STATUS_COLORS[status];
  const priorityColors = TASK_PRIORITY_COLORS[priority];
  const transitions = availableTransitions(status);
  const isTerminal = status === 'done' || status === 'cancelled';

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

  const handleAssign = (profileId: string) => {
    startTransition(() => {
      assignTask(task.id, profileId || null);
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    startTransition(() => {
      updateTaskDetails(task.id, { priority: newPriority });
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
      router.push('/tasks');
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
        className={`rounded-[28px] border bg-white/90 p-6 shadow-panel transition-opacity ${
          isPending ? 'opacity-50' : ''
        } border-camp-forest/10`}
      >
        {/* Header: badges + staff actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
          {isStaff && !isTerminal && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                {isEditing ? 'Cancel edit' : 'Edit'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Edit form (staff only, non-terminal) */}
        {isEditing && isStaff && <EditForm task={task} events={events} profiles={profiles} />}

        {/* Description */}
        {task.description && !isEditing && (
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {task.description}
            </p>
          </div>
        )}

        {/* Staff inline controls: assign + reprioritize */}
        {isStaff && !isTerminal && !isEditing && (
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
            {/* Assignee picker */}
            <div>
              <label
                htmlFor="task-assign"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Reassign
              </label>
              <select
                id="task-assign"
                value={task.assigned_to ?? ''}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name ?? 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            {/* Priority picker */}
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Details grid */}
        {!isEditing && (
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
        )}

        {/* Transition actions */}
        {transitions.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status transitions
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-[24px] border border-red-200 bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-xl text-camp-forest">Delete task?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently remove &ldquo;{task.title}&rdquo;. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit form — inline task detail editing for staff
// ---------------------------------------------------------------------------

function EditForm({
  task,
  events,
  profiles,
}: {
  task: TaskWithProfile;
  events: { id: string; title: string }[];
  profiles: { id: string; display_name: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const title = fd.get('title') as string;
    const description = fd.get('description') as string;
    const priority = fd.get('priority') as string;
    const eventId = fd.get('eventId') as string;
    const assignedTo = fd.get('assignedTo') as string;
    const dueAt = fd.get('dueAt') as string;

    startTransition(async () => {
      try {
        await updateTaskDetails(task.id, {
          title,
          description,
          priority,
          eventId: eventId || null,
          assignedTo: assignedTo || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        });
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed');
      }
    });
  };

  // Format date for datetime-local input
  const dueDefault = task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : '';

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
    >
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Edit details
      </h4>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-3 rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700">
          Updated successfully.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="edit-title" className="mb-1 block text-xs font-medium text-slate-500">
            Title
          </label>
          <input
            id="edit-title"
            name="title"
            type="text"
            defaultValue={task.title}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
          />
        </div>

        <div>
          <label htmlFor="edit-desc" className="mb-1 block text-xs font-medium text-slate-500">
            Description
          </label>
          <textarea
            id="edit-desc"
            name="description"
            rows={3}
            defaultValue={task.description ?? ''}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="edit-priority"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Priority
            </label>
            <select
              id="edit-priority"
              name="priority"
              defaultValue={task.priority}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-assign" className="mb-1 block text-xs font-medium text-slate-500">
              Assignee
            </label>
            <select
              id="edit-assign"
              name="assignedTo"
              defaultValue={task.assigned_to ?? ''}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? 'Unknown'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-event" className="mb-1 block text-xs font-medium text-slate-500">
              Event
            </label>
            <select
              id="edit-event"
              name="eventId"
              defaultValue={task.event_id ?? ''}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
            >
              <option value="">No event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-due" className="mb-1 block text-xs font-medium text-slate-500">
              Due Date
            </label>
            <input
              id="edit-due"
              name="dueAt"
              type="datetime-local"
              defaultValue={dueDefault}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-full bg-camp-forest px-6 py-2 text-sm font-semibold text-white transition hover:bg-camp-forest/90 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
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
