import { expect, type Page, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cleanupInventoryArtifacts,
  createE2EStaffUser,
  createE2ESupabaseAdminClient,
  deleteE2EUser,
  hasSupabaseE2EEnv,
} from './helpers/supabase';

const hasE2EEnv = hasSupabaseE2EEnv();

async function signIn(page: Page, user: { email: string; password: string }) {
  await page.goto('/sign-in?redirectTo=/inventory');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForFunction(() => window.location.pathname === '/inventory');
  await page.waitForLoadState('networkidle');
}

async function createInventoryItem(page: Page, input: { name: string; sku: string }) {
  await page.getByLabel('Item name').fill(input.name);
  await page.getByLabel('SKU').fill(input.sku);
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByText('Item added successfully.')).toBeVisible();
  await expect(page.getByText(input.name, { exact: true })).toBeVisible();
}

function itemCard(page: Page, itemName: string) {
  return page.getByText(itemName, { exact: true }).locator('xpath=ancestor::article[1]');
}

test.describe.serial('inventory e2e', () => {
  test.skip(!hasE2EEnv, 'Supabase e2e environment variables are required');

  let supabase: SupabaseClient;
  let user: Awaited<ReturnType<typeof createE2EStaffUser>>;
  const skuPrefixes = new Set<string>();

  test.beforeAll(async () => {
    supabase = createE2ESupabaseAdminClient();
    user = await createE2EStaffUser(supabase);
  });

  test.afterEach(async () => {
    for (const skuPrefix of skuPrefixes) {
      await cleanupInventoryArtifacts(supabase, {
        skuPrefix,
        operatorName: user?.displayName,
      });
      skuPrefixes.delete(skuPrefix);
    }
  });

  test.afterAll(async () => {
    if (supabase) {
      await cleanupInventoryArtifacts(supabase, {
        skuPrefix: 'PW-E2E-',
        operatorName: user?.displayName,
      });
      await deleteE2EUser(supabase, user?.id);
    }
  });

  test.beforeEach(async ({ page }) => {
    await signIn(page, user);
  });

  test('creates an item and applies inbound and outbound stock movements', async ({ page }) => {
    const skuPrefix = `PW-E2E-${Date.now()}-`;
    const sku = `${skuPrefix}FLOW`;
    const itemName = `Playwright Stock Flow ${Date.now()}`;
    skuPrefixes.add(skuPrefix);

    await createInventoryItem(page, { name: itemName, sku });

    let card = itemCard(page, itemName);
    await expect(card).toContainText(/Stock\s*0/);

    await card.getByLabel('In quantity').fill('3');
    await card.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Stock added successfully.')).toBeVisible();
    await expect(card).toContainText(/Stock\s*3/);
    await expect(page.getByText('Inventory action failed. Please try again.')).toHaveCount(0);

    card = itemCard(page, itemName);
    await card.getByLabel('Out quantity').fill('2');
    await card.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('Stock removed successfully.')).toBeVisible();
    await expect(card).toContainText(/Stock\s*1/);
    await expect(page.getByText('Inventory action failed. Please try again.')).toHaveCount(0);
  });

  test('keeps stock unchanged when outbound quantity exceeds available stock', async ({ page }) => {
    const skuPrefix = `PW-E2E-${Date.now()}-`;
    const sku = `${skuPrefix}LOW`;
    const itemName = `Playwright Low Stock ${Date.now()}`;
    skuPrefixes.add(skuPrefix);

    await createInventoryItem(page, { name: itemName, sku });

    const card = itemCard(page, itemName);
    await card.getByLabel('In quantity').fill('1');
    await card.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Stock added successfully.')).toBeVisible();
    await expect(card).toContainText(/Stock\s*1/);

    await card.getByLabel('Out quantity').fill('2');
    await card.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText('Not enough stock for this outbound movement.')).toBeVisible();
    await expect(card).toContainText(/Stock\s*1/);
    await expect(page.getByText('Inventory action failed. Please try again.')).toHaveCount(0);
  });

  test('shows stock movements in inventory history', async ({ page }) => {
    const skuPrefix = `PW-E2E-${Date.now()}-`;
    const sku = `${skuPrefix}HISTORY`;
    const itemName = `Playwright History ${Date.now()}`;
    skuPrefixes.add(skuPrefix);

    await createInventoryItem(page, { name: itemName, sku });

    const card = itemCard(page, itemName);
    await card.getByLabel('In quantity').fill('4');
    await card.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Stock added successfully.')).toBeVisible();

    await page.getByRole('link', { name: 'View history' }).click();
    await page.waitForFunction(() => window.location.pathname === '/inventory/history');
    const movementCard = page.getByText('Quantity: 4').locator('xpath=ancestor::article[1]');
    await expect(movementCard.getByText(itemName, { exact: true })).toBeVisible();
    await expect(movementCard.getByText(sku, { exact: true })).toBeVisible();
    await expect(movementCard.getByText(`Operator: ${user.displayName}`)).toBeVisible();
  });
});
