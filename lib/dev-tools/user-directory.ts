import { resolveDisplayName } from '@/lib/auth/auth-utils';
import { normalizeRole } from '@/lib/auth/auth-utils';

export type AuthDirectoryUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

export type DirectoryProfile = {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  display_name?: string | null;
};

export type DirectoryEntry = {
  authUserId: string;
  profileId?: string;
  email: string;
  displayName: string;
  role: string;
  profileStatus: 'linked' | 'missing';
  createdAt?: string | null;
  lastSignInAt?: string | null;
};

export function buildDirectoryEntries(input: {
  authUsers: AuthDirectoryUser[];
  profiles: DirectoryProfile[];
}) {
  const profilesByAuthId = new Map(
    input.profiles
      .filter((profile): profile is DirectoryProfile & { auth_user_id: string } =>
        Boolean(profile.auth_user_id)
      )
      .map((profile) => [profile.auth_user_id, profile])
  );

  return input.authUsers.map((user) => {
    const profile = profilesByAuthId.get(user.id);
    const fullName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined
      : asOptionalString(user.user_metadata?.full_name);

    return {
      authUserId: user.id,
      profileId: profile?.id,
      email: profile?.email ?? user.email ?? 'unknown@example.com',
      displayName: resolveDisplayName({
        displayName:
          profile?.display_name ?? asOptionalString(user.user_metadata?.display_name) ?? undefined,
        fullName,
        email: profile?.email ?? user.email ?? undefined,
      }),
      role: normalizeRole(
        asOptionalString(user.app_metadata?.role) ?? asOptionalString(user.user_metadata?.role)
      ).replace('_', ' '),
      profileStatus: profile ? ('linked' as const) : ('missing' as const),
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    };
  });
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}
