import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TaskList, type TaskWithProfile } from './task-list';

export default async function TasksPage() {
  const supabase = await createSupabaseServerClient();

  const { data: authData } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const userId = authData.user?.id;

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
      assigned_to:profiles!tasks_assigned_to_fkey(
        display_name,
        first_name,
        last_name
      )
    `
    )
    .order('created_at', { ascending: false }) ?? { data: [] });

  const tasks = (rawTasks as unknown as TaskWithProfile[]) || [];

  return (
    <AppShell title="Tasks" eyebrow="Authenticated area">
      <TaskList tasks={tasks} currentUserId={userId} />
    </AppShell>
  );
}
