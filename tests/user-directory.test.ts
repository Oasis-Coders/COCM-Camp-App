import { describe, expect, it } from 'vitest';

import {
  buildDirectoryEntries,
  normalizePasswordResetInput,
  normalizeRoleActionInput,
} from '@/lib/dev-tools/user-directory';

describe('user directory', () => {
  it('merges auth users with linked profiles', () => {
    expect(
      buildDirectoryEntries({
        authUsers: [
          {
            id: 'user-1',
            email: 'luke@example.com',
            created_at: '2026-04-08T08:00:00Z',
            last_sign_in_at: '2026-04-08T08:10:00Z',
            app_metadata: { role: 'admin' },
            user_metadata: { display_name: 'Luke Admin' },
          },
        ],
        profiles: [
          {
            id: 'profile-1',
            auth_user_id: 'user-1',
            email: 'luke@example.com',
            first_name: 'Luke',
            last_name: 'Fields',
            preferred_name: 'LQ',
            display_name: 'LQ',
          },
        ],
      })
    ).toEqual([
      {
        authUserId: 'user-1',
        profileId: 'profile-1',
        email: 'luke@example.com',
        displayName: 'LQ',
        role: 'admin',
        profileStatus: 'linked',
        createdAt: '2026-04-08T08:00:00Z',
        lastSignInAt: '2026-04-08T08:10:00Z',
      },
    ]);
  });

  it('marks users without profiles as missing and falls back to email-derived display names', () => {
    expect(
      buildDirectoryEntries({
        authUsers: [
          {
            id: 'user-2',
            email: 'participant@example.com',
            user_metadata: {},
          },
        ],
        profiles: [],
      })
    ).toEqual([
      {
        authUserId: 'user-2',
        profileId: undefined,
        email: 'participant@example.com',
        displayName: 'participant',
        role: 'participant',
        profileStatus: 'missing',
        createdAt: null,
        lastSignInAt: null,
      },
    ]);
  });

  it('falls back to auth metadata for display name and formats super admin roles for the table', () => {
    expect(
      buildDirectoryEntries({
        authUsers: [
          {
            id: 'user-3',
            email: 'leader@example.com',
            app_metadata: { role: 'super_admin' },
            user_metadata: { display_name: 'Camp Lead' },
          },
        ],
        profiles: [],
      })
    ).toEqual([
      {
        authUserId: 'user-3',
        profileId: undefined,
        email: 'leader@example.com',
        displayName: 'Camp Lead',
        role: 'super admin',
        profileStatus: 'missing',
        createdAt: null,
        lastSignInAt: null,
      },
    ]);
  });

  it('normalizes role changes to supported app roles', () => {
    expect(normalizeRoleActionInput('admin')).toBe('admin');
    expect(normalizeRoleActionInput('not-a-role')).toBe('participant');
    expect(normalizeRoleActionInput(undefined)).toBe('participant');
  });

  it('trims password reset input', () => {
    expect(normalizePasswordResetInput('  temp-pass  ')).toBe('temp-pass');
    expect(normalizePasswordResetInput('   ')).toBe('');
    expect(normalizePasswordResetInput(undefined)).toBe('');
  });
});
