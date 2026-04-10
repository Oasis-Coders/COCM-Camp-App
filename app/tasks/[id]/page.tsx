import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';
import {
  fetchTaskById,
  getCurrentUserProfileId,
  fetchEventOptions,
  fetchProfileOptions,
} from '@/lib/tasks/task-queries';
import { TaskDetail } from './task-detail';

type Params = Promise<{ id: string }>;

export default async function TaskDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [task, session, currentProfileId] = await Promise.all([
    fetchTaskById(id),
    getSession(),
    getCurrentUserProfileId(),
  ]);

  if (!task) notFound();

  const isStaff = ['super_admin', 'admin', 'staff'].includes(session.role);

  // Fetch picker data for staff management controls
  let events: { id: string; title: string }[] = [];
  let profiles: { id: string; display_name: string | null }[] = [];

  if (isStaff) {
    [events, profiles] = await Promise.all([fetchEventOptions(), fetchProfileOptions()]);
  }

  return (
    <AppShell title={task.title} eyebrow="Task detail">
      <TaskDetail
        task={task}
        isStaff={isStaff}
        currentProfileId={currentProfileId}
        events={events}
        profiles={profiles}
      />
    </AppShell>
  );
}
