import type { AppRole } from '@/lib/app-config';

const defaultRole: AppRole = 'participant';

export type SignUpProfileInput = {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
};

export type EditableAccountInput = SignUpProfileInput & {
  email?: string;
  password?: string;
};

export type ProvisionedProfileRecord = {
  auth_user_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  preferred_name?: string | null;
  display_name?: string | null;
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

export function normalizeEditableAccountInput(input: EditableAccountInput) {
  return {
    firstName: input.firstName?.trim() ?? '',
    lastName: input.lastName?.trim() ?? '',
    preferredName: input.preferredName?.trim() ?? '',
    email: input.email?.trim() ?? '',
    password: input.password ?? '',
  };
}

export function hasCredentialChanges(
  input: Pick<EditableAccountInput, 'email' | 'password'>,
  currentEmail?: string
) {
  const normalizedEmail = input.email?.trim() ?? '';
  const normalizedCurrentEmail = currentEmail?.trim() ?? '';

  return Boolean(input.password || (normalizedEmail && normalizedEmail !== normalizedCurrentEmail));
}

export function verifyProvisionedProfileRecord(input: {
  profile: ProvisionedProfileRecord | null;
  userId: string;
  email: string;
  expected: SignUpProfileInput;
}) {
  const metadata = buildSignUpMetadata(input.expected);

  if (!input.profile) {
    return false;
  }

  return (
    input.profile.auth_user_id === input.userId &&
    input.profile.email === input.email &&
    input.profile.first_name === metadata.first_name &&
    input.profile.last_name === metadata.last_name &&
    (input.profile.preferred_name ?? null) === (metadata.preferred_name ?? null) &&
    (input.profile.display_name ?? null) === (metadata.display_name ?? null)
  );
}
