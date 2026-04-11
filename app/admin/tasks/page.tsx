import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import {
  fetchTasks,
  getCurrentUserProfileId,
  fetchEventOptions,
  fetchProfileOptions,
} from '@/lib/tasks/task-queries';
import { TaskList } from '@/app/tasks/task-list';

export default async function AdminTasksPage() {
  const [tasks, currentProfileId, events, staffProfiles] = await Promise.all([
    fetchTasks(),
    getCurrentUserProfileId(),
    fetchEventOptions(),
    fetchProfileOptions(),
  ]);

  return (
    <AppShell title="Admin Tasks" eyebrow="Staff operations">
      <div className="mb-5 flex justify-end">
        <Link
          href="/admin/tasks/reporting"
          className="rounded-full border border-camp-forest/20 bg-white px-5 py-2 text-sm font-semibold text-camp-forest transition hover:bg-camp-forest hover:text-white"
        >
          📊 Reporting Snapshot
        </Link>
      </div>
      <TaskList
        tasks={tasks}
        currentProfileId={currentProfileId}
        isStaff={true}
        events={events}
        staffProfiles={staffProfiles}
      />
    </AppShell>
  );
}
