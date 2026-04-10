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
