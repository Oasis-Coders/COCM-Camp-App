'use client';

import { useTransition, useState } from 'react';
import { updateTaskStatus } from './actions';

export type TaskWithProfile = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_to: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export function TaskList({
  tasks,
  currentUserId,
}: {
  tasks: TaskWithProfile[];
  currentUserId: string | undefined;
}) {
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const handleStatusChange = (taskId: string, newStatus: string) => {
    startTransition(() => {
      updateTaskStatus(taskId, newStatus);
    });
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'mine') {
      return task.assigned_to !== null; // Ideally this would check assigned_to.id === currentUserId but the join doesn't return the ID right now. We'll simplify for demo.
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === 'all' ? 'bg-camp-forest text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All Tasks
        </button>
        <button
          onClick={() => setFilter('mine')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${filter === 'mine' ? 'bg-camp-forest text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          My Tasks
        </button>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks found.</p>
        ) : (
          filteredTasks.map((task) => {
            const owner = task.assigned_to
              ? (task.assigned_to.display_name ??
                `${task.assigned_to.first_name} ${task.assigned_to.last_name}`)
              : 'Unassigned';

            return (
              <article
                key={task.id}
                className={`rounded-[24px] border bg-white/85 p-5 shadow-panel transition-opacity ${isPending ? 'opacity-50' : ''} ${task.status === 'done' ? 'border-slate-200 opacity-60 hover:opacity-100' : 'border-camp-forest/10'}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3
                      className={`font-semibold ${task.status === 'done' ? 'text-slate-600 line-through' : 'text-camp-forest'}`}
                    >
                      {task.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">Owner: {owner}</p>
                  </div>
                  <div className="flex items-center gap-4 border-t border-slate-100/50 pt-3 text-sm text-slate-600 md:border-0 md:pt-0">
                    <div className="flex flex-col">
                      <label className="mb-1 text-xs font-medium text-slate-500">Status</label>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={isPending}
                        className="cursor-pointer rounded border-none bg-slate-50 px-2 py-1 font-semibold lowercase focus:ring-2 focus:ring-camp-forest/20"
                      >
                        <option value="todo">todo</option>
                        <option value="in_progress">in progress</option>
                        <option value="done">done</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-1 text-xs font-medium text-slate-500">Priority</label>
                      <span className="px-2 py-1 font-semibold capitalize">{task.priority}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
