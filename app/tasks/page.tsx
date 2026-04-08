import { AppShell } from '@/components/layout/app-shell';
import { sampleTasks } from '@/lib/app-config';

export default async function TasksPage() {
  return (
    <AppShell title="Tasks" eyebrow="Authenticated area">
      <div className="grid gap-4">
        {sampleTasks.map((task) => (
          <article
            key={task.title}
            className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-camp-forest">{task.title}</h3>
                <p className="mt-1 text-sm text-slate-600">Owner: {task.owner}</p>
              </div>
              <div className="text-sm text-slate-600">
                <p>
                  Status:{' '}
                  <span className="font-semibold capitalize">{task.status.replace('_', ' ')}</span>
                </p>
                <p>
                  Priority: <span className="font-semibold capitalize">{task.priority}</span>
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
