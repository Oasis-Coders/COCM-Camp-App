'use client';

import { useTransition, useState, useRef } from 'react';
import { createTask, updateTaskDetails } from './actions';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskPriority } from '@/lib/tasks/task-model';
import type { TaskWithProfile } from './task-list';

type TaskFormProps = {
  onClose: () => void;
  events: { id: string; title: string }[];
  staffProfiles: { id: string; display_name: string | null }[];
  task?: TaskWithProfile;
};

export function TaskForm({ onClose, events, staffProfiles, task }: TaskFormProps) {
  const isEditing = !!task;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as string;
    const status = formData.get('status') as string;
    const assignedTo = formData.get('assignedTo') as string;
    const eventId = formData.get('eventId') as string;
    const dueAt = formData.get('dueAt') as string;

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    startTransition(async () => {
      try {
        let res;
        if (isEditing && task) {
          res = await updateTaskDetails(task.id, {
            title: title || undefined,
            description: description || undefined,
            priority: priority || undefined,
            assignedTo: assignedTo || null,
            eventId: eventId || null,
            dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          });
        } else {
          res = await createTask({
            title,
            description,
            priority,
            status,
            assignedTo: assignedTo || undefined,
            eventId: eventId || undefined,
            dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          });
        }

        if (res?.error) {
          setError(res.error);
        } else {
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save task');
      }
    });
  };

  // Convert ISO string to local datetime-local format (YYYY-MM-DDThh:mm)
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-panel border border-camp-forest/10 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-2xl text-camp-forest">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-camp-moss"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label htmlFor="task-title" className="mb-1 block text-xs font-medium text-camp-moss">
              Title *
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              required
              defaultValue={task?.title}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              placeholder="e.g. Finalize counselor roster"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-description"
              className="mb-1 block text-xs font-medium text-camp-moss"
            >
              Description
            </label>
            <textarea
              id="task-description"
              name="description"
              rows={3}
              defaultValue={task?.description ?? ''}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              placeholder="Optional details about what needs to happen…"
            />
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1 block text-xs font-medium text-camp-moss"
              >
                Priority
              </label>
              <select
                id="task-priority"
                name="priority"
                defaultValue={task?.priority ?? 'medium'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p as TaskPriority]}
                  </option>
                ))}
              </select>
            </div>
            {!isEditing && (
              <div>
                <label
                  htmlFor="task-status"
                  className="mb-1 block text-xs font-medium text-camp-moss"
                >
                  Initial Status
                </label>
                <select
                  id="task-status"
                  name="status"
                  defaultValue="draft"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                </select>
              </div>
            )}
          </div>

          {/* Assignee + Event row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-assignee"
                className="mb-1 block text-xs font-medium text-camp-moss"
              >
                Assign To
              </label>
              <select
                id="task-assignee"
                name="assignedTo"
                defaultValue={task?.assigned_to ?? ''}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              >
                <option value="">Unassigned</option>
                {staffProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name ?? 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-event" className="mb-1 block text-xs font-medium text-camp-moss">
                Event
              </label>
              <select
                id="task-event"
                name="eventId"
                defaultValue={task?.event_id ?? ''}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              >
                <option value="">No event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="task-due" className="mb-1 block text-xs font-medium text-camp-moss">
              Due Date
            </label>
            <input
              id="task-due"
              name="dueAt"
              type="datetime-local"
              defaultValue={formatDateTime(task?.due_at)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
            />
          </div>

          {/* Actions */}
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-camp-moss transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-camp-ember px-4 py-2.5 text-sm font-semibold text-white shadow-ember-glow transition-all hover:bg-camp-ember-dark disabled:opacity-60"
            >
              {isPending
                ? isEditing
                  ? 'Saving…'
                  : 'Creating…'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
