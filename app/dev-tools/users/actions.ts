'use server';

import { revalidatePath } from 'next/cache';

import { normalizeRoleActionInput } from '@/lib/dev-tools/user-directory';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type ChangeUserRoleState = {
  status: 'idle' | 'success' | 'error';
  message: string | null;
  role: string | null;
  submittedAt: number | null;
};

export async function changeUserRole(
  _previousState: ChangeUserRoleState,
  formData: FormData
): Promise<ChangeUserRoleState> {
  const userId = String(formData.get('userId') ?? '');
  const targetRole = normalizeRoleActionInput(String(formData.get('role') ?? 'participant'));
  const currentUserId = String(formData.get('currentUserId') ?? '');

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      status: 'error',
      message: 'This environment needs the Supabase service role key for admin actions.',
      role: null,
      submittedAt: Date.now(),
    };
  }

  const { data: authUserData, error: authUserError } =
    await supabase.auth.admin.getUserById(userId);

  if (authUserError || !authUserData.user) {
    return {
      status: 'error',
      message: 'The role change could not be completed.',
      role: null,
      submittedAt: Date.now(),
    };
  }

  const user = authUserData.user;
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      role: targetRole,
    },
    user_metadata: {
      ...(user.user_metadata ?? {}),
      role: targetRole,
    },
  });

  if (authUpdateError) {
    return {
      status: 'error',
      message: 'The role change could not be completed.',
      role: null,
      submittedAt: Date.now(),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle<{ id: string }>();

  if (profile?.id) {
    try {
      const { data: roleRecord, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', targetRole)
        .single<{ id: string }>();

      if (roleError || !roleRecord) {
        throw roleError ?? new Error('Role record unavailable');
      }

      const { error: deleteRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', profile.id);

      if (deleteRolesError) {
        throw deleteRolesError;
      }

      const { error: insertRoleError } = await supabase.from('user_roles').insert({
        user_id: profile.id,
        role_id: roleRecord.id,
      });

      if (insertRoleError) {
        throw insertRoleError;
      }
    } catch {
      // Auth metadata is the source of truth for app permissions. Some environments do not seed
      // the legacy profile role tables, so this linkage sync is intentionally best effort.
    }
  }

  revalidatePath('/dev-tools/users');
  revalidatePath('/profile');

  return {
    status: 'success',
    message:
      userId === currentUserId
        ? 'User role updated successfully. Reload the app if your own navigation should change immediately.'
        : 'User role updated successfully.',
    role: targetRole,
    submittedAt: Date.now(),
  };
}
