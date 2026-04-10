'use client';

import { useTransition, useState, useRef } from 'react';
import { createTask } from './actions';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskPriority } from '@/lib/tasks/task-model';

type CreateTaskFormProps = {
  onClose: () => void;
  events: { id: string; title: string }[];
  staffProfiles: { id: string; display_name: string | null }[];
};

export function CreateTaskForm({ onClose, events, staffProfiles }: CreateTaskFormProps) {
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
        await createTask({
          title,
          description,
          priority,
          status,
          assignedTo: assignedTo || undefined,
          eventId: eventId || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-[28px] border border-camp-forest/10 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-serif text-2xl text-camp-forest">New Task</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
            <label htmlFor="task-title" className="mb-1 block text-xs font-medium text-slate-500">
              Title *
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              placeholder="e.g. Finalize counselor roster"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="task-description"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Description
            </label>
            <textarea
              id="task-description"
              name="description"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              placeholder="Optional details about what needs to happen…"
            />
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1 block text-xs font-medium text-slate-500"
              >
                Priority
              </label>
              <select
                id="task-priority"
                name="priority"
                defaultValue="medium"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p as TaskPriority]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-status"
                className="mb-1 block text-xs font-medium text-slate-500"
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
          </div>

          {/* Assignee + Event row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-assignee"
                className="mb-1 block text-xs font-medium text-slate-500"
              >
                Assign To
              </label>
              <select
                id="task-assignee"
                name="assignedTo"
                defaultValue=""
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
              <label htmlFor="task-event" className="mb-1 block text-xs font-medium text-slate-500">
                Event
              </label>
              <select
                id="task-event"
                name="eventId"
                defaultValue=""
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
            <label htmlFor="task-due" className="mb-1 block text-xs font-medium text-slate-500">
              Due Date
            </label>
            <input
              id="task-due"
              name="dueAt"
              type="datetime-local"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-camp-forest/30 focus:outline-none focus:ring-2 focus:ring-camp-forest/10"
            />
          </div>

          {/* Actions */}
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-full bg-camp-forest px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-camp-forest/90 disabled:opacity-60"
            >
              {isPending ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
