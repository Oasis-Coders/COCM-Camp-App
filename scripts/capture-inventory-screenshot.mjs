import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.INVENTORY_SCREENSHOT_URL ?? 'http://127.0.0.1:3000';
const outputPath =
  process.env.INVENTORY_SCREENSHOT_PATH ??
  path.join(process.cwd(), 'artifacts', 'screenshots', 'inventory.png');
const role = process.env.INVENTORY_SCREENSHOT_ROLE ?? 'staff';
const email = process.env.INVENTORY_SCREENSHOT_EMAIL;
const password = process.env.INVENTORY_SCREENSHOT_PASSWORD;
const viewport = {
  width: Number(process.env.INVENTORY_SCREENSHOT_WIDTH ?? 1440),
  height: Number(process.env.INVENTORY_SCREENSHOT_HEIGHT ?? 1000),
};

function cookieUrl() {
  const url = new URL(baseUrl);
  return `${url.protocol}//${url.host}`;
}

async function signInWithPassword(page) {
  if (!email || !password) {
    return false;
  }

  const signInUrl = new URL('/sign-in', baseUrl);
  signInUrl.searchParams.set('redirectTo', '/inventory');

  await page.goto(signInUrl.toString(), { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').waitFor();
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL('**/inventory', { timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ]);

  return true;
}

async function addDemoCookies(context) {
  await context.addCookies([
    {
      name: 'camp-demo-auth',
      value: 'true',
      url: cookieUrl(),
      sameSite: 'Lax',
    },
    {
      name: 'camp-demo-role',
      value: role,
      url: cookieUrl(),
      sameSite: 'Lax',
    },
    {
      name: 'camp-demo-email',
      value: `${role}@demo.local`,
      url: cookieUrl(),
      sameSite: 'Lax',
    },
    {
      name: 'camp-demo-name',
      value: `Demo ${role.replace('_', ' ')}`,
      url: cookieUrl(),
      sameSite: 'Lax',
    },
  ]);
}

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);

    const usedPasswordSignIn = await signInWithPassword(page);

    if (!usedPasswordSignIn) {
      await addDemoCookies(context);
      await page.goto(new URL('/inventory', baseUrl).toString(), { waitUntil: 'domcontentloaded' });
    }

    const currentPath = new URL(page.url()).pathname;

    if (currentPath.startsWith('/sign-in')) {
      throw new Error(
        'Inventory screenshot landed on sign-in. Set INVENTORY_SCREENSHOT_EMAIL and INVENTORY_SCREENSHOT_PASSWORD for Supabase-enabled environments, or run against a demo-only environment.'
      );
    }

    await page
      .getByRole('heading', { name: /inventory/i })
      .first()
      .waitFor();
    await page.screenshot({ path: outputPath, fullPage: true });
  } finally {
    await browser.close();
  }

  // eslint-disable-next-line no-console
  console.log(`Inventory screenshot saved to ${outputPath}`);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
