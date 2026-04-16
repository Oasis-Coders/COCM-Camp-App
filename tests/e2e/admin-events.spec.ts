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
  await page.goto('/sign-in?redirectTo=/admin/events');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction(() => window.location.pathname === '/admin/events');
  await page.waitForLoadState('networkidle');
}

async function cleanupAdminEventArtifacts(supabase: SupabaseClient, slugPrefix: string) {
  const { data: events, error: readError } = await supabase
    .from('events')
    .select('id')
    .like('slug', `${slugPrefix}%`);

  if (readError) {
    throw readError;
  }

  const eventIds = (events ?? []).map((event) => event.id as string);

  if (eventIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase.from('events').delete().in('id', eventIds);

  if (deleteError) {
    throw deleteError;
  }
}

test.describe.serial('admin events e2e', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');

  let supabase: SupabaseClient;
  const createdUserIds = new Set<string>();
  const eventSlugPrefixes = new Set<string>();

  test.beforeAll(() => {
    supabase = createE2ESupabaseAdminClient();
  });

  test.afterEach(async () => {
    for (const slugPrefix of eventSlugPrefixes) {
      await cleanupAdminEventArtifacts(supabase, slugPrefix);
      eventSlugPrefixes.delete(slugPrefix);
    }

    for (const userId of createdUserIds) {
      await deleteE2EUser(supabase, userId);
      createdUserIds.delete(userId);
    }
  });

  test('staff can create an event and see validation errors for duplicates', async ({ page }) => {
    const browserErrors = watchForBrowserErrors(page);
    const timestamp = Date.now();
    const slug = `pw-event-${timestamp}`;
    const eventTitle = `PW Event ${timestamp}`;
    eventSlugPrefixes.add('pw-event-');

    const adminUser = await createE2EUser(supabase, {
      role: 'staff',
      emailPrefix: 'pw-admin-event',
      displayNamePrefix: 'PW Admin Event',
    });
    createdUserIds.add(adminUser.id);

    await signIn(page, adminUser);

    // Navigate to create form
    await page.goto('/admin/events/new');

    // Fill the form securely
    await page.getByLabel('Event Title').fill(eventTitle);
    await page.getByLabel('Slug (URL identifier)').fill(slug);

    await page.locator('input[name="starts_at"]').fill('2026-10-10T10:00');
    await page.locator('input[name="ends_at"]').fill('2026-10-10T12:00');

    await page.getByLabel(/Capacity/).fill('50');

    // Submit
    await page.getByRole('button', { name: 'Create Event' }).click();

    // Verify it redirects to the Event Detail page (not the create form anymore)
    await page.waitForFunction(
      () =>
        window.location.pathname.startsWith('/admin/events/') &&
        window.location.pathname !== '/admin/events/new'
    );

    // Wait to ensure event exists and DB state is committed
    await page.waitForLoadState('networkidle');

    // Now try to create the exact same event to test validation errors surfaced to UI
    await page.goto('/admin/events/new');
    await page.getByLabel('Event Title').fill(eventTitle);
    await page.getByLabel('Slug (URL identifier)').fill(slug);
    await page.locator('input[name="starts_at"]').fill('2026-10-10T10:00');
    await page.locator('input[name="ends_at"]').fill('2026-10-10T12:00');

    // Capture dialog/alert window triggered by the app on error
    const dialogPromise = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'Create Event' }).click();

    const dialog = await dialogPromise;
    // We expect the duplicate slug constraint to be properly surfaced through our server-action fix!
    expect(dialog.message()).toContain('violates unique constraint');
    await dialog.accept();

    browserErrors.expectNone();
  });
});
