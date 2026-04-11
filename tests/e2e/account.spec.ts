import { expect, type Page, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import { watchForBrowserErrors } from './helpers/browser-errors';
import {
  createE2ESupabaseAdminClient,
  createE2EUser,
  deleteE2EUser,
  deleteE2EUsersByEmailPrefix,
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

test.describe.serial('account e2e', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');

  let supabase: SupabaseClient;
  const createdUserIds = new Set<string>();
  const createdEmailPrefixes = new Set<string>();

  test.beforeAll(() => {
    supabase = createE2ESupabaseAdminClient();
  });

  test.afterEach(async () => {
    for (const emailPrefix of createdEmailPrefixes) {
      await deleteE2EUsersByEmailPrefix(supabase, emailPrefix);
      createdEmailPrefixes.delete(emailPrefix);
    }

    for (const userId of createdUserIds) {
      await deleteE2EUser(supabase, userId);
      createdUserIds.delete(userId);
    }
  });

  test('creates an account and lands on the profile page without browser errors', async ({
    page,
  }) => {
    const browserErrors = watchForBrowserErrors(page);
    const timestamp = Date.now();
    const emailPrefix = `pw-account-${timestamp}`;
    const email = `${emailPrefix}@example.com`;
    const password = `PwAccount!${timestamp}Aa1`;
    createdEmailPrefixes.add(emailPrefix);

    await page.goto('/sign-up?redirectTo=/profile');
    await page.getByLabel('First name').fill('Playwright');
    await page.getByLabel('Last name').fill('Account');
    await page.getByLabel('Preferred name').fill('PW Account');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.waitForFunction(() => window.location.pathname === '/profile');
    const main = page.getByRole('main');
    await expect(main.getByText('PW Account', { exact: true })).toBeVisible();
    await expect(main.getByText(email, { exact: true })).toBeVisible();
    await expect(main.getByText('participant', { exact: true })).toBeVisible();
    await expect(page.getByText(/could not|failed|error/i)).toHaveCount(0);
    browserErrors.expectNone();
  });

  test('changes the current account role without browser errors', async ({ page }) => {
    const browserErrors = watchForBrowserErrors(page);
    const user = await createE2EUser(supabase, {
      role: 'super_admin',
      emailPrefix: 'pw-role',
      displayNamePrefix: 'PW Role',
    });
    createdUserIds.add(user.id);

    await signIn(page, user);
    await page.goto('/dev-tools/users');
    await page.waitForLoadState('networkidle');

    const currentUserRow = page
      .getByText(user.email, { exact: true })
      .locator('xpath=ancestor::tr[1]');
    await expect(currentUserRow).toBeVisible();
    await currentUserRow.getByLabel('Change role').selectOption('admin');
    await expect(currentUserRow.getByLabel('Change role')).toHaveValue('admin');
    await expect(page).toHaveURL(/\/dev-tools\/users$/);
    await currentUserRow.getByRole('button', { name: 'Save' }).click();

    await expect(
      currentUserRow.getByText(
        'User role updated successfully. Reload the app if your own navigation should change immediately.'
      )
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dev-tools\/users$/);
    await expect(currentUserRow.getByLabel('Change role')).toHaveValue('admin');
    await expect(page.getByText('The role change could not be completed.')).toHaveCount(0);

    await page.goto('/profile');
    const main = page.getByRole('main');
    await expect(main.getByText(user.email, { exact: true })).toBeVisible();
    await expect(main.getByText('admin', { exact: true })).toBeVisible();
    await expect(page.getByText(/could not|failed|error/i)).toHaveCount(0);
    browserErrors.expectNone();
  });
});
