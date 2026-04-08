import type { AppRole } from '@/lib/app-config';

const defaultRole: AppRole = 'participant';

export function normalizeRole(value: string | undefined): AppRole {
  if (
    value === 'super_admin' ||
    value === 'admin' ||
    value === 'staff' ||
    value === 'participant'
  ) {
    return value;
  }

  return defaultRole;
}

export function resolveUserRole(metadata: { appRole?: string; userRole?: string }): AppRole {
  return normalizeRole(metadata.appRole ?? metadata.userRole);
}

export function resolveDisplayName(input: {
  displayName?: string;
  fullName?: string;
  email?: string;
}): string {
  return input.displayName ?? input.fullName ?? input.email?.split('@')[0] ?? 'Camp user';
}

export function sanitizeRedirectTo(value: string | undefined, fallback = '/dashboard'): string {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}
