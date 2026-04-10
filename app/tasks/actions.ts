'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import {
  isTaskStatus,
  isTaskPriority,
  isValidTransition,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/tasks/task-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthenticatedSupabase() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    throw new Error('Unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  return { session, supabase };
}

async function getCurrentProfileId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  if (!supabase) throw new Error('Supabase client unavailable');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');
  return profile.id as string;
}

function requireStaff(role: string) {
  if (!['super_admin', 'admin', 'staff'].includes(role)) {
    throw new Error('Staff access required');
  }
}

// ---------------------------------------------------------------------------
// Create Task
// ---------------------------------------------------------------------------

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  eventId?: string;
  dueAt?: string;
};

export async function createTask(input: CreateTaskInput) {
  const { session, supabase } = await getAuthenticatedSupabase();
  requireStaff(session.role);

  const profileId = await getCurrentProfileId(supabase);

  const status: TaskStatus = input.status && isTaskStatus(input.status) ? input.status : 'draft';
  const priority: TaskPriority =
    input.priority && isTaskPriority(input.priority) ? input.priority : 'medium';

  if (!input.title?.trim()) {
    throw new Error('Title is required');
  }

  const { error } = await supabase.from('tasks').insert({
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status,
    priority,
    assigned_to: input.assignedTo || null,
    event_id: input.eventId || null,
    due_at: input.dueAt || null,
    created_by: profileId,
  });

  if (error) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task');
  }

  revalidatePath('/tasks');
  revalidatePath('/admin/tasks');
}

// ---------------------------------------------------------------------------
// Update Task Status (with transition validation)
// ---------------------------------------------------------------------------

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const { session, supabase } = await getAuthenticatedSupabase();

  if (!isTaskStatus(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  // Fetch current status to validate transition
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('status')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) {
    throw new Error('Task not found');
  }

  const currentStatus = task.status as TaskStatus;

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(`Cannot transition from "${currentStatus}" to "${newStatus}"`);
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = { status: newStatus };

  // If completing, record who completed it
  if (newStatus === 'done') {
    const profileId = await getCurrentProfileId(supabase);
    updatePayload.completed_by = profileId;
  }

  const { error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);

  if (error) {
    console.error('Error updating task status:', error);
    throw new Error('Failed to update task status');
  }

  revalidatePath('/tasks');
  revalidatePath('/admin/tasks');
}

// ---------------------------------------------------------------------------
// Assign Task
// ---------------------------------------------------------------------------

export async function assignTask(taskId: string, profileId: string | null) {
  const { session, supabase } = await getAuthenticatedSupabase();
  requireStaff(session.role);

  const { error } = await supabase
    .from('tasks')
    .update({ assigned_to: profileId })
    .eq('id', taskId);

  if (error) {
    console.error('Error assigning task:', error);
    throw new Error('Failed to assign task');
  }

  revalidatePath('/tasks');
  revalidatePath('/admin/tasks');
}

// ---------------------------------------------------------------------------
// Update Task Details
// ---------------------------------------------------------------------------

export type UpdateTaskDetailsInput = {
  title?: string;
  description?: string;
  priority?: string;
  dueAt?: string | null;
  eventId?: string | null;
};

export async function updateTaskDetails(taskId: string, input: UpdateTaskDetailsInput) {
  const { session, supabase } = await getAuthenticatedSupabase();
  requireStaff(session.role);

  const payload: Record<string, unknown> = {};

  if (input.title !== undefined) {
    if (!input.title.trim()) throw new Error('Title cannot be empty');
    payload.title = input.title.trim();
  }
  if (input.description !== undefined) {
    payload.description = input.description?.trim() || null;
  }
  if (input.priority !== undefined) {
    if (!isTaskPriority(input.priority)) throw new Error(`Invalid priority: ${input.priority}`);
    payload.priority = input.priority;
  }
  if (input.dueAt !== undefined) {
    payload.due_at = input.dueAt;
  }
  if (input.eventId !== undefined) {
    payload.event_id = input.eventId;
  }

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);

  if (error) {
    console.error('Error updating task details:', error);
    throw new Error('Failed to update task details');
  }

  revalidatePath('/tasks');
  revalidatePath('/admin/tasks');
}

// ---------------------------------------------------------------------------
// Delete Task
// ---------------------------------------------------------------------------

export async function deleteTask(taskId: string) {
  const { session, supabase } = await getAuthenticatedSupabase();
  requireStaff(session.role);

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error('Failed to delete task');
  }

  revalidatePath('/tasks');
  revalidatePath('/admin/tasks');
}
