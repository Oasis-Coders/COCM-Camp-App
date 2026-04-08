import type { AppRole } from '@/lib/app-config';

const defaultRole: AppRole = 'participant';

export type SignUpProfileInput = {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
};

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

export function buildSignUpMetadata(input: SignUpProfileInput) {
  const firstName = input.firstName?.trim() ?? '';
  const lastName = input.lastName?.trim() ?? '';
  const preferredName = input.preferredName?.trim() ?? '';

  return {
    first_name: firstName,
    last_name: lastName,
    preferred_name: preferredName || undefined,
    full_name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
    display_name: preferredName || [firstName, lastName].filter(Boolean).join(' ') || undefined,
  };
}
