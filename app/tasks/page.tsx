import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';
import {
  fetchTasks,
  getCurrentUserProfileId,
  fetchEventOptions,
  fetchProfileOptions,
} from '@/lib/tasks/task-queries';
import { TaskList } from './task-list';

export default async function TasksPage() {
  const session = await getSession();
  const isStaff = ['super_admin', 'admin', 'staff'].includes(session.role);

  const [tasks, currentProfileId] = await Promise.all([fetchTasks(), getCurrentUserProfileId()]);

  // Only load picker data for staff (needed by create form)
  let events: { id: string; title: string }[] = [];
  let staffProfiles: { id: string; display_name: string | null }[] = [];

  if (isStaff) {
    [events, staffProfiles] = await Promise.all([fetchEventOptions(), fetchProfileOptions()]);
  }

  return (
    <AppShell title="Tasks" eyebrow={isStaff ? 'Staff operations' : 'Your assignments'}>
      <TaskList
        tasks={tasks}
        currentProfileId={currentProfileId}
        isStaff={isStaff}
        events={events}
        staffProfiles={staffProfiles}
      />
    </AppShell>
  );
}
