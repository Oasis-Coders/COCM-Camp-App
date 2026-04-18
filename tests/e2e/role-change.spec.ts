import { expect, type Page, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { watchForBrowserErrors } from './helpers/browser-errors';
import {
  createE2ESupabaseAdminClient,
  createE2EUser,
  deleteE2EUser,
  hasSupabaseE2EEnv,
} from './helpers/supabase';

const hasE2EEnv = hasSupabaseE2EEnv();

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/sign-in?redirectTo=/dashboard');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction(() => window.location.pathname === '/dashboard');
  await page.waitForLoadState('networkidle');
}

test.describe.serial('role change e2e', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');

  let supabase: SupabaseClient;
  const createdUserIds = new Set<string>();

  test.beforeAll(() => {
    supabase = createE2ESupabaseAdminClient();
  });

  test.afterEach(async () => {
    for (const userId of createdUserIds) {
      await deleteE2EUser(supabase, userId);
      createdUserIds.delete(userId);
    }
  });

  test('self-role-change to super_admin is recognized immediately without reload', async ({
    page,
  }) => {
    const browserErrors = watchForBrowserErrors(page);
    const user = await createE2EUser(supabase, {
      role: 'admin',
      emailPrefix: 'pw-upgrade',
      displayNamePrefix: 'PW Upgrade',
    });
    createdUserIds.add(user.id);

    await signIn(page, user);

    // Navigate to Dev Tools user directory and change own role to super_admin
    await page.goto('/dev-tools/users');
    await page.waitForLoadState('networkidle');

    const currentUserRow = page
      .getByText(user.email, { exact: true })
      .locator('xpath=ancestor::tr[1]');
    await expect(currentUserRow).toBeVisible();
    await currentUserRow.getByLabel('Change role').selectOption('super_admin');
    await expect(currentUserRow.getByLabel('Change role')).toHaveValue('super_admin');
    await currentUserRow.getByRole('button', { name: 'Save' }).click();

    // Verify success message does NOT tell the user to reload
    await expect(
      currentUserRow.getByText('Role updated to super admin. The app will refresh automatically.')
    ).toBeVisible();
    await expect(
      page.getByText('Reload the app if your own navigation should change immediately.')
    ).toHaveCount(0);
    await expect(currentUserRow.getByLabel('Change role')).toHaveValue('super_admin');
    await expect(page.getByText('The role change could not be completed.')).toHaveCount(0);

    // Navigate to the profile page and verify the new role is active
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const main = page.getByRole('main');
    await expect(main.getByText(user.email, { exact: true })).toBeVisible();
    await expect(main.getByText('super admin', { exact: true })).toBeVisible();

    // Verify the sidebar shows role-restricted nav items (Admin + Inventory require staffPrivilegedRoles)
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Admin', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Inventory', { exact: true })).toBeVisible();

    browserErrors.expectNone();
  });

  test('role downgrade from super_admin to participant restricts access', async ({ page }) => {
    const browserErrors = watchForBrowserErrors(page);
    const user = await createE2EUser(supabase, {
      role: 'super_admin',
      emailPrefix: 'pw-downgrade',
      displayNamePrefix: 'PW Downgrade',
    });
    createdUserIds.add(user.id);

    await signIn(page, user);

    // Navigate to Dev Tools and downgrade own role to participant
    await page.goto('/dev-tools/users');
    await page.waitForLoadState('networkidle');

    const currentUserRow = page
      .getByText(user.email, { exact: true })
      .locator('xpath=ancestor::tr[1]');
    await expect(currentUserRow).toBeVisible();
    await currentUserRow.getByLabel('Change role').selectOption('participant');
    await expect(currentUserRow.getByLabel('Change role')).toHaveValue('participant');
    await currentUserRow.getByRole('button', { name: 'Save' }).click();

    await expect(
      currentUserRow.getByText('Role updated to participant. The app will refresh automatically.')
    ).toBeVisible();

    // Navigate to the dashboard and verify restricted nav items are hidden
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Dashboard', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Admin', { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText('Inventory', { exact: true })).toHaveCount(0);

    // Attempting to access /admin should redirect to /dashboard
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);

    browserErrors.expectNone();
  });
});
