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

async function signOut(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForFunction(() => window.location.pathname === '/sign-in');
}

async function getProfileIdForUser(supabase: SupabaseClient, userId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data.id as string;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Profile was not created for e2e user ${userId}`);
}

async function cleanupCalendarArtifacts(supabase: SupabaseClient, titlePrefix: string) {
  const { data: events, error: readError } = await supabase
    .from('personal_calendar_events')
    .select('id')
    .like('title', `${titlePrefix}%`);

  if (readError) {
    throw readError;
  }

  const eventIds = (events ?? []).map((event) => event.id as string);

  if (eventIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase
    .from('personal_calendar_events')
    .delete()
    .in('id', eventIds);

  if (deleteError) {
    throw deleteError;
  }
}

test.describe.serial('calendar e2e', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');

  let supabase: SupabaseClient;
  const createdUserIds = new Set<string>();
  const calendarTitlePrefixes = new Set<string>();

  test.beforeAll(() => {
    supabase = createE2ESupabaseAdminClient();
  });

  test.afterEach(async () => {
    for (const titlePrefix of calendarTitlePrefixes) {
      await cleanupCalendarArtifacts(supabase, titlePrefix);
      calendarTitlePrefixes.delete(titlePrefix);
    }

    for (const userId of createdUserIds) {
      await deleteE2EUser(supabase, userId);
      createdUserIds.delete(userId);
    }
  });

  test('creates an invitation, lets the invitee accept, and shows owner status', async ({
    page,
  }) => {
    const browserErrors = watchForBrowserErrors(page);
    const timestamp = Date.now();
    const titlePrefix = `PW Calendar Invite ${timestamp}`;
    const eventTitle = `${titlePrefix} Flow`;
    calendarTitlePrefixes.add(titlePrefix);

    const owner = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-calendar-owner',
      displayNamePrefix: 'PW Calendar Owner',
    });
    const invitee = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-calendar-invitee',
      displayNamePrefix: 'PW Calendar Invitee',
    });
    createdUserIds.add(owner.id);
    createdUserIds.add(invitee.id);
    const inviteeProfileId = await getProfileIdForUser(supabase, invitee.id);

    await signIn(page, owner);
    await page
      .getByRole('button', { name: /create event on/i })
      .first()
      .click();
    await expect(page.getByRole('button', { name: 'Create event' })).toBeDisabled();
    await page.getByLabel('Title').fill(eventTitle);
    await page.getByLabel('Invitees').fill(invitee.email);
    await page.getByRole('button', { name: new RegExp(invitee.email) }).click();
    await expect(page.getByText(invitee.email, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Create event' }).click();
    await expect(page.getByText('Event added to your calendar.')).toBeVisible();
    await expect(page.getByText(eventTitle, { exact: true })).toBeVisible();
    await expect(page.getByText('1 pending')).toBeVisible();

    const { data: invite, error: inviteReadError } = await supabase
      .from('personal_calendar_event_invitees')
      .select('invite_status, event:personal_calendar_events!inner(title)')
      .eq('invitee_profile_id', inviteeProfileId)
      .eq('event.title', eventTitle)
      .single();

    expect(inviteReadError).toBeNull();
    expect(invite?.invite_status).toBe('pending');

    await signOut(page);
    await signIn(page, invitee);
    const invitedEventCard = page
      .getByText(eventTitle, { exact: true })
      .locator('xpath=ancestor::button[1]');
    await expect(invitedEventCard).toContainText('Pending');
    await invitedEventCard.click();
    await expect(page.getByRole('heading', { name: eventTitle })).toBeVisible();
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(page.getByText('Invite accepted.')).toBeVisible();
    await expect(
      page.getByText(eventTitle, { exact: true }).locator('xpath=ancestor::button[1]')
    ).toContainText('Accepted');

    await signOut(page);
    await signIn(page, owner);
    await page.getByText(eventTitle, { exact: true }).locator('xpath=ancestor::button[1]').click();
    await expect(page.getByText('Invite status')).toBeVisible();
    await expect(page.getByText('Accepted', { exact: true })).toBeVisible();
    await expect(page.getByText(/could not|failed|error/i)).toHaveCount(0);
    browserErrors.expectNone();
  });
});
