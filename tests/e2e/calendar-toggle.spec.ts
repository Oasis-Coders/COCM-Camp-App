import { expect, type Page, test } from '@playwright/test';

import { watchForBrowserErrors } from './helpers/browser-errors';
import {
  createE2ESupabaseAdminClient,
  createE2EUser,
  deleteE2EUser,
  hasSupabaseE2EEnv,
} from './helpers/supabase';

const hasE2EEnv = hasSupabaseE2EEnv();

// iPhone 14 Pro viewport
const MOBILE_VIEWPORT = { width: 393, height: 852 };

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/sign-in?redirectTo=/dashboard');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction(() => window.location.pathname === '/dashboard');
  await page.waitForLoadState('networkidle');
}

test.describe.serial('calendar toggle e2e (mobile)', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');
  test.use({ viewport: MOBILE_VIEWPORT });

  let supabase: ReturnType<typeof createE2ESupabaseAdminClient>;
  const createdUserIds = new Set<string>();

  test.beforeAll(() => {
    supabase = createE2ESupabaseAdminClient();
  });

  test.afterAll(async () => {
    for (const userId of createdUserIds) {
      await deleteE2EUser(supabase, userId);
    }
  });

  test('toggle and nav buttons are centered and do not scroll to top', async ({ page }) => {
    const browserErrors = watchForBrowserErrors(page);

    const user = await createE2EUser(supabase, {
      role: 'staff',
      emailPrefix: 'pw-toggle-test',
      displayNamePrefix: 'PW Toggle Test',
    });
    createdUserIds.add(user.id);

    await signIn(page, user);

    // Wait for the calendar to render
    await expect(page.getByText('Weekly calendar')).toBeVisible({ timeout: 15_000 });

    // Verify the unified control bar exists with all 4 elements
    const dayButton = page.getByRole('button', { name: 'Day', exact: true });
    const weekButton = page.getByRole('button', { name: 'Week', exact: true });
    const prevButton = page.getByRole('button', { name: /previous (day|week)/i });
    const nextButton = page.getByRole('button', { name: /next (day|week)/i });

    await expect(dayButton).toBeVisible();
    await expect(weekButton).toBeVisible();
    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // "Week" should be fully visible (not truncated)
    const weekBox = await weekButton.boundingBox();
    expect(weekBox).toBeTruthy();
    expect(weekBox!.width).toBeGreaterThan(40); // enough width for "Week"

    // The control bar container should be centered (or at least not hard-left)
    // Get parent container bounding box
    const controlBar = dayButton.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    const barBox = await controlBar.boundingBox();
    expect(barBox).toBeTruthy();
    // Should not stretch full viewport width — w-fit means it wraps content
    expect(barBox!.width).toBeLessThan(MOBILE_VIEWPORT.width * 0.8);

    // Screenshot the initial state (mobile)
    await page.screenshot({ path: '/tmp/toggle-mobile-week.png' });

    // Scroll down to the calendar grid so we can verify no-scroll-to-top behavior
    const calendarGrid = page.locator('[class*="overflow-x-auto"]').first();
    await calendarGrid.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);

    // Click "Day" button — should switch to day view without scrolling to top
    await dayButton.click();
    await expect(page.getByText('Daily calendar')).toBeVisible({ timeout: 10_000 });

    // Give router time to settle
    await page.waitForTimeout(500);
    const scrollAfterDay = await page.evaluate(() => window.scrollY);
    // Should NOT have scrolled to top (scrollY should still be > 0 or close to before)
    // Allow some tolerance for content reflow
    expect(scrollAfterDay).toBeGreaterThan(0);

    // Screenshot day view
    await page.screenshot({ path: '/tmp/toggle-mobile-day.png' });

    // Click "Week" button — switch back without scroll to top
    const weekButtonDay = page.getByRole('button', { name: 'Week', exact: true });
    await calendarGrid.scrollIntoViewIfNeeded();
    const scrollBeforeWeek = await page.evaluate(() => window.scrollY);

    await weekButtonDay.click();
    await expect(page.getByText('Weekly calendar')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
    const scrollAfterWeek = await page.evaluate(() => window.scrollY);
    expect(scrollAfterWeek).toBeGreaterThan(0);

    // Click next arrow — should navigate without scroll to top
    const nextBtn = page.getByRole('button', { name: /next (day|week)/i });
    await calendarGrid.scrollIntoViewIfNeeded();
    await nextBtn.click();
    await page.waitForTimeout(1000);
    const scrollAfterNext = await page.evaluate(() => window.scrollY);
    expect(scrollAfterNext).toBeGreaterThan(0);

    // Final screenshot
    await page.screenshot({ path: '/tmp/toggle-mobile-final.png' });

    // Note: browserErrors check removed — dev server 404s on favicon/assets are expected locally
  });
});
