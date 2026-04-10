import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TaskList, type TaskWithProfile } from '@/app/tasks/task-list';

export default async function AdminTasksPage() {
  const supabase = await createSupabaseServerClient();
  const session = await getSession();

  const { data: authData } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const userId = authData.user?.id;

  const isStaff = ['super_admin', 'admin', 'staff'].includes(session.role);

  // Admin view: all tasks, no RLS filtering needed (staff+ sees everything)
  const { data: rawTasks } = await (supabase
    ?.from('tasks')
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      due_at,
      completed_at,
      assigned_to_profile:profiles!tasks_assigned_to_fkey(
        id,
        display_name,
        first_name,
        last_name
      ),
      created_by_profile:profiles!tasks_created_by_fkey(
        display_name
      ),
      event:events!tasks_event_id_fkey(
        title
      )
    `
    )
    .order('created_at', { ascending: false }) ?? { data: [] });

  const tasks = (rawTasks as unknown as TaskWithProfile[]) || [];

  const { data: rawEvents } = await (supabase
    ?.from('events')
    .select('id, title')
    .order('starts_at', { ascending: true }) ?? { data: [] });
  const events = (rawEvents as { id: string; title: string }[]) || [];

  const { data: rawProfiles } = await (supabase
    ?.from('profiles')
    .select('id, display_name')
    .order('display_name', { ascending: true }) ?? { data: [] });
  const staffProfiles = (rawProfiles as { id: string; display_name: string | null }[]) || [];

  return (
    <AppShell title="Admin Tasks" eyebrow="Staff operations">
      <TaskList
        tasks={tasks}
        currentUserId={userId}
        isStaff={isStaff}
        events={events}
        staffProfiles={staffProfiles}
      />
    </AppShell>
  );
}
