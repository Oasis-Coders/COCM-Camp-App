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
import { emitTaskEvent } from '@/lib/notifications/emit';
import { logServerError } from '@/lib/observability/logger';

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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    console.error(`[getCurrentProfileId] Profile not found for auth_user_id: ${user.id}`, error);

    // Fallback: try to insert a minimal profile if the trigger failed
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || 'Participant',
        last_name: user.user_metadata?.last_name || '',
      })
      .select('id')
      .single();

    if (newProfile) {
      // eslint-disable-next-line no-console
      console.info(`[getCurrentProfileId] Auto-created fallback profile for ${user.email}`);
      return newProfile.id as string;
    }

    console.error(`[getCurrentProfileId] Failed to auto-create profile:`, insertError);
    throw new Error('Profile not found. Please contact support.');
  }

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

export async function createTask(input: CreateTaskInput): Promise<{ error?: string }> {
  try {
    const { session, supabase } = await getAuthenticatedSupabase();
    requireStaff(session.role);

    const profileId = await getCurrentProfileId(supabase);

    const status: TaskStatus = input.status && isTaskStatus(input.status) ? input.status : 'draft';
    const priority: TaskPriority =
      input.priority && isTaskPriority(input.priority) ? input.priority : 'medium';

    if (!input.title?.trim()) {
      throw new Error('Title is required');
    }

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status,
        priority,
        assigned_to: input.assignedTo || null,
        event_id: input.eventId || null,
        due_at: input.dueAt || null,
        created_by: profileId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return { error: error.message || 'Failed to create task' };
    }

    // --- Notification trigger: task.created ---
    emitTaskEvent(
      {
        name: 'task.created',
        payload: {
          taskId: newTask.id,
          taskTitle: input.title.trim(),
          eventId: input.eventId || null,
          actorProfileId: profileId,
          assigneeProfileId: input.assignedTo || null,
          status,
          priority,
        },
      },
      { creatorProfileId: profileId, assigneeProfileId: input.assignedTo || null }
    );

    revalidatePath('/tasks');
    revalidatePath('/admin/tasks');

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Update Task Status (with transition validation)
// ---------------------------------------------------------------------------

export async function updateTaskStatus(
  taskId: string,
  newStatus: string
): Promise<{ error?: string }> {
  try {
    const { session, supabase } = await getAuthenticatedSupabase();

    if (!isTaskStatus(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    // Fetch current task to validate transition and get context
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('status, title, assigned_to, created_by, event_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new Error('Task not found');
    }

    const currentStatus = task.status as TaskStatus;

    if (!isValidTransition(currentStatus, newStatus)) {
      return { error: `Cannot transition from "${currentStatus}" to "${newStatus}"` };
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = { status: newStatus };

    const profileId = await getCurrentProfileId(supabase);

    // If completing, record who completed it
    if (newStatus === 'done') {
      updatePayload.completed_by = profileId;
    }

    const { error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);

    if (error) {
      logServerError({
        scope: 'tasks.update_status',
        message: 'Error updating task status',
        error,
        context: {
          status,
          taskId,
        },
      });
      return { error: error.message || 'Failed to update task status' };
    }

    // --- Notification triggers for status changes ---
    const notificationContext = {
      creatorProfileId: task.created_by ?? undefined,
      assigneeProfileId: task.assigned_to,
    };

    if (newStatus === 'done') {
      // task.completed — specific event for completion
      emitTaskEvent(
        {
          name: 'task.completed',
          payload: {
            taskId,
            taskTitle: task.title,
            eventId: task.event_id,
            actorProfileId: profileId,
            assigneeProfileId: task.assigned_to,
          },
        },
        notificationContext
      );
    } else {
      // task.status_changed — general status transition
      emitTaskEvent(
        {
          name: 'task.status_changed',
          payload: {
            taskId,
            taskTitle: task.title,
            eventId: task.event_id,
            actorProfileId: profileId,
            fromStatus: currentStatus,
            toStatus: newStatus as TaskStatus,
          },
        },
        notificationContext
      );
    }

    revalidatePath('/tasks');
    revalidatePath('/admin/tasks');

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Assign Task
// ---------------------------------------------------------------------------

export async function assignTask(
  taskId: string,
  profileId: string | null
): Promise<{ error?: string }> {
  try {
    const { session, supabase } = await getAuthenticatedSupabase();
    requireStaff(session.role);

    const actorProfileId = await getCurrentProfileId(supabase);

    // Fetch current task to get previous assignee and title
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('title, assigned_to, created_by, event_id')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new Error('Task not found');
    }

    const { error } = await supabase
      .from('tasks')
      .update({ assigned_to: profileId })
      .eq('id', taskId);

    if (error) {
      console.error('Error assigning task:', error);
      return { error: error.message || 'Failed to assign task' };
    }

    // --- Notification trigger: task.assigned / task.unassigned ---
    if (profileId) {
      emitTaskEvent(
        {
          name: 'task.assigned',
          payload: {
            taskId,
            taskTitle: task.title,
            eventId: task.event_id,
            actorProfileId,
            assigneeProfileId: profileId,
            previousAssigneeProfileId: task.assigned_to,
          },
        },
        { creatorProfileId: task.created_by ?? undefined, assigneeProfileId: profileId }
      );
    } else if (task.assigned_to) {
      emitTaskEvent(
        {
          name: 'task.unassigned',
          payload: {
            taskId,
            taskTitle: task.title,
            eventId: task.event_id,
            actorProfileId,
            previousAssigneeProfileId: task.assigned_to,
          },
        },
        { creatorProfileId: task.created_by ?? undefined }
      );
    }

    revalidatePath('/tasks');
    revalidatePath('/admin/tasks');

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
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
  assignedTo?: string | null;
};

export async function updateTaskDetails(
  taskId: string,
  input: UpdateTaskDetailsInput
): Promise<{ error?: string }> {
  try {
    const { session, supabase } = await getAuthenticatedSupabase();
    requireStaff(session.role);

    const actorProfileId = await getCurrentProfileId(supabase);

    // Fetch current task for change tracking and notification context
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('title, description, priority, due_at, event_id, assigned_to, created_by')
      .eq('id', taskId)
      .single();

    if (fetchError || !task) {
      throw new Error('Task not found');
    }

    const payload: Record<string, unknown> = {};
    const changes: { field: string; oldValue?: string | null; newValue?: string | null }[] = [];

    if (input.title !== undefined) {
      if (!input.title.trim()) throw new Error('Title cannot be empty');
      if (input.title.trim() !== task.title) {
        changes.push({ field: 'title', oldValue: task.title, newValue: input.title.trim() });
      }
      payload.title = input.title.trim();
    }
    if (input.description !== undefined) {
      if ((input.description?.trim() || null) !== (task.description || null)) {
        changes.push({ field: 'description' });
      }
      payload.description = input.description?.trim() || null;
    }
    if (input.priority !== undefined) {
      if (!isTaskPriority(input.priority)) throw new Error(`Invalid priority: ${input.priority}`);
      if (input.priority !== task.priority) {
        changes.push({ field: 'priority', oldValue: task.priority, newValue: input.priority });
      }
      payload.priority = input.priority;
    }
    if (input.dueAt !== undefined) {
      if (input.dueAt !== task.due_at) {
        changes.push({ field: 'due_at', oldValue: task.due_at, newValue: input.dueAt });
      }
      payload.due_at = input.dueAt;
    }
    if (input.eventId !== undefined) {
      if (input.eventId !== task.event_id) {
        changes.push({ field: 'event_id', oldValue: task.event_id, newValue: input.eventId });
      }
      payload.event_id = input.eventId;
    }
    if (input.assignedTo !== undefined) {
      payload.assigned_to = input.assignedTo;
    }

    if (Object.keys(payload).length === 0) return {};

    const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);

    if (error) {
      console.error('Error updating task details:', error);
      return { error: error.message || 'Failed to update task details' };
    }

    // --- Notification trigger: task.updated (only if something actually changed) ---
    if (changes.length > 0) {
      emitTaskEvent(
        {
          name: 'task.updated',
          payload: {
            taskId,
            taskTitle: input.title?.trim() ?? task.title,
            eventId: input.eventId !== undefined ? input.eventId : task.event_id,
            actorProfileId,
            changes,
          },
        },
        {
          creatorProfileId: task.created_by ?? undefined,
          assigneeProfileId: task.assigned_to,
        }
      );
    }

    revalidatePath('/tasks');
    revalidatePath('/admin/tasks');

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Delete Task
// ---------------------------------------------------------------------------

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  try {
    const { session, supabase } = await getAuthenticatedSupabase();
    requireStaff(session.role);

    const actorProfileId = await getCurrentProfileId(supabase);

    // Fetch task info before deletion for notification
    const { data: task } = await supabase
      .from('tasks')
      .select('title, assigned_to, created_by, event_id')
      .eq('id', taskId)
      .single();

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return { error: error.message || 'Failed to delete task' };
    }

    // --- Notification trigger: task.deleted ---
    if (task) {
      emitTaskEvent(
        {
          name: 'task.deleted',
          payload: {
            taskId,
            taskTitle: task.title,
            eventId: task.event_id,
            actorProfileId,
            assigneeProfileId: task.assigned_to,
          },
        },
        {
          creatorProfileId: task.created_by ?? undefined,
          assigneeProfileId: task.assigned_to,
        }
      );
    }

    revalidatePath('/tasks');
    revalidatePath('/admin/tasks');

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
