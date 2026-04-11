import { cookies } from 'next/headers';

import { staffPrivilegedRoles, type AppRole } from '@/lib/app-config';
import { normalizeRole, resolveDisplayName, resolveUserRole } from '@/lib/auth/auth-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';

export type DemoSession = {
  isAuthenticated: boolean;
  role: AppRole;
  email: string;
  displayName: string;
  mode: 'demo' | 'supabase';
};

export async function getSession(): Promise<DemoSession> {
  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (user) {
      const role = resolveUserRole({
        appRole: user.app_metadata?.role as string | undefined,
        userRole: user.user_metadata?.role as string | undefined,
      });
      const displayName = resolveDisplayName({
        displayName: user.user_metadata?.display_name as string | undefined,
        fullName: user.user_metadata?.full_name as string | undefined,
        email: user.email,
      });

      return {
        isAuthenticated: true,
        role,
        email: user.email ?? 'unknown@example.com',
        displayName,
        mode: 'supabase',
      };
    }

    return {
      isAuthenticated: false,
      role: 'participant',
      email: 'participant@demo.local',
      displayName: 'Demo User',
      mode: 'supabase',
    };
  }

  const store = await cookies();
  const authCookie = store.get('camp-demo-auth')?.value;
  const role = normalizeRole(store.get('camp-demo-role')?.value);
  const email = store.get('camp-demo-email')?.value ?? 'participant@demo.local';
  const displayName = store.get('camp-demo-name')?.value ?? 'Demo User';

  return {
    isAuthenticated: authCookie === 'true',
    role,
    email,
    displayName,
    mode: 'demo',
  };
}

export async function hasElevatedAccess() {
  const session = await getSession();
  return staffPrivilegedRoles.includes(session.role);
}
