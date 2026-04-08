import { describe, expect, it } from 'vitest';

import {
  normalizeRole,
  resolveDisplayName,
  resolveUserRole,
  sanitizeRedirectTo,
} from '@/lib/auth/auth-utils';

describe('auth utils', () => {
  it('normalizes known roles and falls back to participant', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('staff')).toBe('staff');
    expect(normalizeRole('unknown')).toBe('participant');
    expect(normalizeRole(undefined)).toBe('participant');
  });

  it('prefers app role over user role', () => {
    expect(
      resolveUserRole({
        appRole: 'super_admin',
        userRole: 'participant',
      })
    ).toBe('super_admin');
  });

  it('uses user role when app role is missing', () => {
    expect(
      resolveUserRole({
        userRole: 'staff',
      })
    ).toBe('staff');
  });

  it('resolves the best available display name', () => {
    expect(
      resolveDisplayName({
        displayName: 'Camp Lead',
        fullName: 'Full Name',
        email: 'lead@example.com',
      })
    ).toBe('Camp Lead');

    expect(
      resolveDisplayName({
        fullName: 'Full Name',
        email: 'lead@example.com',
      })
    ).toBe('Full Name');

    expect(
      resolveDisplayName({
        email: 'lead@example.com',
      })
    ).toBe('lead');

    expect(resolveDisplayName({})).toBe('Camp user');
  });

  it('sanitizes redirect targets to local app paths', () => {
    expect(sanitizeRedirectTo('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectTo('/events/spring')).toBe('/events/spring');
    expect(sanitizeRedirectTo('/')).toBe('/');
    expect(sanitizeRedirectTo('/sign-up?redirectTo=/dashboard')).toBe(
      '/sign-up?redirectTo=/dashboard'
    );
    expect(sanitizeRedirectTo('https://evil.example')).toBe('/dashboard');
    expect(sanitizeRedirectTo('//evil.example')).toBe('/dashboard');
    expect(sanitizeRedirectTo('dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectTo(undefined, '/profile')).toBe('/profile');
  });
});
