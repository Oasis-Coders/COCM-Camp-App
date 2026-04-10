import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { fetchTasksForReporting, fetchProfileOptions } from '@/lib/tasks/task-queries';
import { buildReportSnapshot } from '@/lib/tasks/task-reporting';
import {
  TASK_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/tasks/task-model';

export default async function TaskReportingPage() {
  const [tasks, profiles] = await Promise.all([fetchTasksForReporting(), fetchProfileOptions()]);

  const snapshot = buildReportSnapshot(tasks);

  // Build a profile lookup for assignee names
  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name ?? 'Unknown']));

  return (
    <AppShell title="Task Reporting" eyebrow="Snapshot overview">
      <div className="flex flex-col gap-6">
        {/* Top-line metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TopMetric
            label="Total Tasks"
            value={snapshot.completion.total}
            helper="All tasks across every status"
          />
          <TopMetric
            label="Completion Rate"
            value={`${snapshot.completion.completionPercent}%`}
            helper={`${snapshot.completion.completed} done of ${snapshot.completion.total}`}
            accent={snapshot.completion.completionPercent >= 70 ? 'green' : undefined}
          />
          <TopMetric
            label="Overdue"
            value={snapshot.overdueCount}
            helper="Past due date, not yet done"
            accent={snapshot.overdueCount > 0 ? 'red' : undefined}
          />
          <TopMetric
            label="Unassigned"
            value={snapshot.unassignedActiveCount}
            helper="Active tasks with no assignee"
            accent={snapshot.unassignedActiveCount > 0 ? 'amber' : undefined}
          />
        </div>

        {/* Status + Priority breakdown side-by-side */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status breakdown */}
          <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss">
              By Status
            </h3>
            <div className="flex flex-col gap-3">
              {snapshot.statusBreakdown.map((row) => {
                const colors = TASK_STATUS_COLORS[row.status];
                const pct =
                  snapshot.completion.total > 0
                    ? Math.round((row.count / snapshot.completion.total) * 100)
                    : 0;
                return (
                  <div key={row.status} className="flex items-center gap-3">
                    <span
                      className={`inline-flex w-28 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      {row.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${colors.dot} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-slate-700">
                      {row.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss">
              By Priority
            </h3>
            <div className="flex flex-col gap-3">
              {snapshot.priorityBreakdown.map((row) => {
                const colors = TASK_PRIORITY_COLORS[row.priority];
                const pct =
                  snapshot.completion.total > 0
                    ? Math.round((row.count / snapshot.completion.total) * 100)
                    : 0;
                return (
                  <div key={row.priority} className="flex items-center gap-3">
                    <span
                      className={`inline-flex w-28 rounded-full px-3 py-1 text-xs font-semibold ${colors.bg} ${colors.text}`}
                    >
                      {row.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full bg-slate-400 transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-slate-700">
                      {row.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Assignee workload */}
        {snapshot.assigneeWorkload.length > 0 && (
          <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss">
              Workload by Assignee
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-4">Assignee</th>
                    <th className="pb-3 pr-4 text-center">Total</th>
                    <th className="pb-3 pr-4 text-center">Open</th>
                    <th className="pb-3 pr-4 text-center">In Progress</th>
                    <th className="pb-3 pr-4 text-center">Blocked</th>
                    <th className="pb-3 text-center">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.assigneeWorkload.map((row) => (
                    <tr
                      key={row.assigneeId ?? 'unassigned'}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-slate-700">
                        {row.assigneeId ? (
                          (profileMap.get(row.assigneeId) ?? 'Unknown')
                        ) : (
                          <span className="italic text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center font-semibold">{row.total}</td>
                      <td className="py-3 pr-4 text-center">
                        {row.open > 0 ? (
                          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-semibold text-blue-700">
                            {row.open}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {row.inProgress > 0 ? (
                          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-50 px-2 text-xs font-semibold text-amber-700">
                            {row.inProgress}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {row.blocked > 0 ? (
                          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-50 px-2 text-xs font-semibold text-red-700">
                            {row.blocked}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {row.done > 0 ? (
                          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-green-50 px-2 text-xs font-semibold text-green-700">
                            {row.done}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completion summary card */}
        <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss">
            Completion Summary
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  className="stroke-slate-100"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  className="stroke-green-500"
                  strokeWidth="3"
                  strokeDasharray={`${snapshot.completion.completionPercent} ${100 - snapshot.completion.completionPercent}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-camp-forest">
                  {snapshot.completion.completionPercent}%
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-green-700">
                  {snapshot.completion.completed}
                </span>{' '}
                completed
              </p>
              <p>
                <span className="font-semibold text-slate-700">{snapshot.completion.active}</span>{' '}
                active
              </p>
              <p>
                <span className="font-semibold text-slate-400">
                  {snapshot.completion.cancelled}
                </span>{' '}
                cancelled
              </p>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="flex gap-3">
          <Link
            href="/admin/tasks"
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            ← Back to tasks
          </Link>
          <Link
            href="/tasks"
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            View all tasks
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Top metric card (local component)
// ---------------------------------------------------------------------------

function TopMetric({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string | number;
  helper: string;
  accent?: 'green' | 'red' | 'amber';
}) {
  const accentColor =
    accent === 'green'
      ? 'text-green-600'
      : accent === 'red'
        ? 'text-red-600'
        : accent === 'amber'
          ? 'text-amber-600'
          : 'text-camp-forest';

  return (
    <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss">{label}</p>
      <p className={`mt-3 font-serif text-4xl ${accentColor}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </article>
  );
}
