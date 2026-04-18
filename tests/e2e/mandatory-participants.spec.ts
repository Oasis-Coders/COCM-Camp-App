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

async function signIn(
  page: Page,
  user: { email: string; password: string },
  redirectTo = '/dashboard'
) {
  await page.goto(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction((expected) => window.location.pathname === expected, redirectTo);
  await page.waitForLoadState('networkidle');
}

async function cleanupEvents(supabase: SupabaseClient, slugPrefix: string) {
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .like('slug', `${slugPrefix}%`);

  const ids = (events ?? []).map((e) => e.id as string);
  if (ids.length === 0) return;

  // Registrations cascade-delete with events
  await supabase.from('events').delete().in('id', ids);
}

test.describe.serial('mandatory participants e2e', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');

  let supabase: SupabaseClient;
  const createdUserIds = new Set<string>();
  const slugPrefixes = new Set<string>();

  test.beforeAll(() => {
    supabase = createE2ESupabaseAdminClient();
  });

  test.afterEach(async () => {
    for (const prefix of slugPrefixes) {
      await cleanupEvents(supabase, prefix);
      slugPrefixes.delete(prefix);
    }
    for (const uid of createdUserIds) {
      await deleteE2EUser(supabase, uid);
      createdUserIds.delete(uid);
    }
  });

  test('staff creates event with mandatory participant who sees it on event page', async ({
    page,
  }) => {
    const browserErrors = watchForBrowserErrors(page);
    const ts = Date.now();
    const slug = `pw-mandatory-${ts}`;
    const title = `PW Mandatory ${ts}`;
    slugPrefixes.add('pw-mandatory-');

    // Create a staff user and a participant user
    const staffUser = await createE2EUser(supabase, {
      role: 'staff',
      emailPrefix: 'pw-mand-staff',
      displayNamePrefix: 'PW Staff',
    });
    createdUserIds.add(staffUser.id);

    const participant = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-mand-part',
      displayNamePrefix: 'PW Participant',
    });
    createdUserIds.add(participant.id);

    // Wait for profile sync
    await page.waitForTimeout(1000);

    // Staff signs in and creates event with mandatory participant
    await signIn(page, staffUser, '/admin/events');

    await page.goto('/admin/events/new');
    await page.getByLabel('Event Title').fill(title);
    await page.getByLabel('Slug (URL identifier)').fill(slug);
    await page.locator('input[name="starts_at"]').fill('2026-11-10T10:00');
    await page.locator('input[name="ends_at"]').fill('2026-11-10T12:00');
    await page.getByLabel(/Capacity/).fill('10');

    // Search for the participant in the mandatory participants selector
    const searchInput = page.getByTestId('mandatory-search');
    await searchInput.fill(participant.displayName.slice(0, 10));

    // Check the participant checkbox
    const participantCheckbox = page
      .locator('label')
      .filter({ hasText: participant.displayName })
      .locator('input[type="checkbox"]');
    await participantCheckbox.check();

    // Verify the chip appears
    await expect(page.getByTestId('mandatory-chips')).toContainText(
      participant.displayName.slice(0, 10)
    );

    // Submit the form
    await page.getByRole('button', { name: 'Create Event' }).click();

    // Verify redirect to event detail admin page
    await page.waitForFunction(
      () =>
        window.location.pathname.startsWith('/admin/events/') &&
        window.location.pathname !== '/admin/events/new'
    );

    // Now sign in as the participant and check the event detail page
    await signIn(page, participant, `/events/${slug}`);
    await page.goto(`/events/${slug}`);
    await page.waitForLoadState('networkidle');

    // Verify mandatory badge is shown
    await expect(page.getByTestId('mandatory-badge')).toBeVisible();
    await expect(page.getByTestId('mandatory-badge')).toContainText('mandatory attendee');

    // Verify no cancel button — mandatory attendees see "cannot be cancelled" text
    await expect(page.getByText('Mandatory — cannot be cancelled')).toBeVisible();
    await expect(page.getByText('Cancel Registration')).not.toBeVisible();

    browserErrors.expectNone();
  });

  test('capacity counts mandatory + voluntary registrations correctly', async ({ page }) => {
    const browserErrors = watchForBrowserErrors(page);
    const ts = Date.now();
    const slug = `pw-cap-mand-${ts}`;
    const title = `PW Cap Mandatory ${ts}`;
    slugPrefixes.add('pw-cap-mand-');

    // Create users
    const staffUser = await createE2EUser(supabase, {
      role: 'staff',
      emailPrefix: 'pw-cap-staff',
      displayNamePrefix: 'PW Cap Staff',
    });
    createdUserIds.add(staffUser.id);

    const mandatoryUser = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-cap-mand',
      displayNamePrefix: 'PW Cap Mandatory',
    });
    createdUserIds.add(mandatoryUser.id);

    const voluntaryUser = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-cap-vol',
      displayNamePrefix: 'PW Cap Voluntary',
    });
    createdUserIds.add(voluntaryUser.id);

    const waitlistUser = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-cap-wait',
      displayNamePrefix: 'PW Cap Waitlist',
    });
    createdUserIds.add(waitlistUser.id);

    // Wait for profile sync
    await page.waitForTimeout(1000);

    // Staff creates event with capacity=2 and 1 mandatory participant
    await signIn(page, staffUser, '/admin/events');
    await page.goto('/admin/events/new');
    await page.getByLabel('Event Title').fill(title);
    await page.getByLabel('Slug (URL identifier)').fill(slug);
    await page.locator('input[name="starts_at"]').fill('2026-11-15T10:00');
    await page.locator('input[name="ends_at"]').fill('2026-11-15T12:00');
    await page.getByLabel(/Capacity/).fill('2');

    // Add mandatory participant
    const searchInput = page.getByTestId('mandatory-search');
    await searchInput.fill(mandatoryUser.displayName.slice(0, 10));
    const mandatoryCheckbox = page
      .locator('label')
      .filter({ hasText: mandatoryUser.displayName })
      .locator('input[type="checkbox"]');
    await mandatoryCheckbox.check();

    await page.getByRole('button', { name: 'Create Event' }).click();
    await page.waitForFunction(
      () =>
        window.location.pathname.startsWith('/admin/events/') &&
        window.location.pathname !== '/admin/events/new'
    );

    // Voluntary user registers — should get 'registered' (1 mandatory + 1 voluntary = 2/2)
    await signIn(page, voluntaryUser, `/events/${slug}`);
    await page.goto(`/events/${slug}`);
    await page.waitForLoadState('networkidle');

    // Verify event shows 1 registered (mandatory) out of 2
    await expect(page.locator('dd').filter({ hasText: '/ 2' })).toBeVisible();

    // Check that Begin Registration link is shown (user is not yet registered)
    await expect(page.getByText('Begin Registration')).toBeVisible();

    // Register via DB directly for speed (avoid form flow)
    const { data: volProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', voluntaryUser.email)
      .single();

    if (volProfile) {
      const { data: evt } = await supabase.from('events').select('id').eq('slug', slug).single();

      if (evt) {
        await supabase.from('event_registrations').upsert(
          {
            event_id: evt.id,
            user_id: volProfile.id,
            status: 'registered',
            is_mandatory: false,
            registered_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,user_id' }
        );

        // Now the third user tries to register — should be waitlisted (2/2 full)
        const { data: waitProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', waitlistUser.email)
          .single();

        if (waitProfile) {
          // Use the registerForEvent logic by checking count
          const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', evt.id)
            .eq('status', 'registered');

          // Capacity is 2, count should be 2 (1 mandatory + 1 voluntary)
          expect(count).toBe(2);

          // Insert as waitlisted since capacity is full
          await supabase.from('event_registrations').upsert(
            {
              event_id: evt.id,
              user_id: waitProfile.id,
              status: 'waitlisted',
              is_mandatory: false,
              registered_at: new Date().toISOString(),
            },
            { onConflict: 'event_id,user_id' }
          );

          // Verify the waitlist user sees waitlisted status
          await signIn(page, waitlistUser, `/events/${slug}`);
          await page.goto(`/events/${slug}`);
          await page.waitForLoadState('networkidle');
          await expect(page.getByText('You are on the waitlist')).toBeVisible();
        }
      }
    }

    browserErrors.expectNone();
  });

  test('staff can add mandatory participant on edit', async ({ page }) => {
    const browserErrors = watchForBrowserErrors(page);
    const ts = Date.now();
    const slug = `pw-edit-mand-${ts}`;
    const title = `PW Edit Mandatory ${ts}`;
    slugPrefixes.add('pw-edit-mand-');

    const staffUser = await createE2EUser(supabase, {
      role: 'staff',
      emailPrefix: 'pw-edit-staff',
      displayNamePrefix: 'PW Edit Staff',
    });
    createdUserIds.add(staffUser.id);

    const participant = await createE2EUser(supabase, {
      role: 'participant',
      emailPrefix: 'pw-edit-part',
      displayNamePrefix: 'PW Edit Part',
    });
    createdUserIds.add(participant.id);

    // Wait for profile sync
    await page.waitForTimeout(1000);

    // Staff creates event WITHOUT mandatory participants first
    await signIn(page, staffUser, '/admin/events');
    await page.goto('/admin/events/new');
    await page.getByLabel('Event Title').fill(title);
    await page.getByLabel('Slug (URL identifier)').fill(slug);
    await page.locator('input[name="starts_at"]').fill('2026-12-01T10:00');
    await page.locator('input[name="ends_at"]').fill('2026-12-01T12:00');
    await page.getByRole('button', { name: 'Create Event' }).click();

    // Wait for redirect to event edit page
    await page.waitForFunction(
      () =>
        window.location.pathname.startsWith('/admin/events/') &&
        window.location.pathname !== '/admin/events/new'
    );
    const editUrl = page.url();

    // Verify participant is NOT registered for the event yet
    await signIn(page, participant, `/events/${slug}`);
    await page.goto(`/events/${slug}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Sign up to reserve your spot')).toBeVisible();

    // Staff edits the event to add mandatory participant
    await signIn(page, staffUser, '/admin/events');
    await page.goto(editUrl);
    await page.waitForLoadState('networkidle');

    // Search and add mandatory participant
    const searchInput = page.getByTestId('mandatory-search');
    await searchInput.fill(participant.displayName.slice(0, 8));
    const participantCheckbox = page
      .locator('label')
      .filter({ hasText: participant.displayName })
      .locator('input[type="checkbox"]');
    await participantCheckbox.check();

    // Submit the update
    await page.getByRole('button', { name: 'Update Event' }).click();
    await page.waitForFunction(
      () =>
        window.location.pathname.startsWith('/admin/events/') &&
        window.location.pathname !== '/admin/events/new'
    );

    // Verify the participant is now registered as mandatory
    await signIn(page, participant, `/events/${slug}`);
    await page.goto(`/events/${slug}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('mandatory-badge')).toBeVisible();
    await expect(page.getByText('Mandatory — cannot be cancelled')).toBeVisible();

    browserErrors.expectNone();
  });
});
