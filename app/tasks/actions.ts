'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { logServerError } from '@/lib/observability/logger';

export async function updateTaskStatus(taskId: string, status: string) {
  const session = await getSession();
  if (!session.isAuthenticated) {
    throw new Error('Unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);

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
    throw new Error('Failed to update task status');
  }

  revalidatePath('/tasks');
}
