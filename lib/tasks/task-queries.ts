import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TaskWithProfile } from '@/app/tasks/task-list';

/** Shared Supabase select string for task queries. */
const TASK_SELECT = `
  id,
  title,
  description,
  status,
  priority,
  due_at,
  completed_at,
  created_by,
  assigned_to,
  event_id,
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
`;

/**
 * Fetch tasks from Supabase with all related data.
 * RLS handles visibility — staff sees everything, participants see only assigned/created.
 */
export async function fetchTasks(): Promise<TaskWithProfile[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await (supabase
    ?.from('tasks')
    .select(TASK_SELECT)
    .order('created_at', { ascending: false }) ?? { data: [] });

  return (data as unknown as TaskWithProfile[]) || [];
}

/**
 * Fetch a single task by ID.
 */
export async function fetchTaskById(taskId: string): Promise<TaskWithProfile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.from('tasks').select(TASK_SELECT).eq('id', taskId).single();

  return (data as unknown as TaskWithProfile) ?? null;
}

/**
 * Get the current user's profile ID from supabase auth.
 */
export async function getCurrentUserProfileId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  return (profile?.id as string) ?? null;
}

/**
 * Fetch events list (for create/edit forms).
 */
export async function fetchEventOptions(): Promise<{ id: string; title: string }[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await (supabase
    ?.from('events')
    .select('id, title')
    .order('starts_at', { ascending: true }) ?? { data: [] });

  return (data as { id: string; title: string }[]) || [];
}

/**
 * Fetch all profiles (for assignee picker).
 */
export async function fetchProfileOptions(): Promise<
  { id: string; display_name: string | null }[]
> {
  const supabase = await createSupabaseServerClient();

  const { data } = await (supabase
    ?.from('profiles')
    .select('id, display_name')
    .order('display_name', { ascending: true }) ?? { data: [] });

  return (data as { id: string; display_name: string | null }[]) || [];
}
