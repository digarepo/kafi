import { test, expect, type Page } from '@playwright/test';

const email = process.env.KAFI_BENCHMARK_EMAIL;
const password = process.env.KAFI_BENCHMARK_PASSWORD;

async function login(page: Page) {
  if (!email || !password) {
    throw new Error(
      'KAFI_BENCHMARK_EMAIL and KAFI_BENCHMARK_PASSWORD are required',
    );
  }
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/$/, { waitUntil: 'networkidle' });
}

function pathOf(url: string) {
  return new URL(url).pathname;
}

test.describe('Phase 4 cache and freshness regression', () => {
  test('stable references reuse, expire at TTL, and do not cache failures', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalNow = Date.now;
      Date.now = () =>
        originalNow() +
        Number(sessionStorage.getItem('__phase4_time_offset_ms') ?? 0);
    });
    await login(page);

    const referenceRequests: string[] = [];
    page.on('request', (request) => {
      const path = pathOf(request.url());
      if (
        request.method() === 'GET' &&
        (path === '/api/admin/registration-statuses' ||
          path === '/api/admin/package-versions')
      ) {
        referenceRequests.push(path);
      }
    });

    await page.goto('/registrations', { waitUntil: 'networkidle' });
    const firstCount = referenceRequests.length;
    await page.reload({ waitUntil: 'networkidle' });
    expect(referenceRequests.length).toBe(firstCount);

    await page.evaluate(() =>
      sessionStorage.setItem('__phase4_time_offset_ms', String(15 * 60 * 1000 + 1)),
    );
    await page.reload({ waitUntil: 'networkidle' });
    expect(referenceRequests.length).toBeGreaterThan(firstCount);

    const failedPage = await page.context().newPage();
    await failedPage.addInitScript(() => {
      const originalNow = Date.now;
      Date.now = () =>
        originalNow() +
        Number(sessionStorage.getItem('__phase4_time_offset_ms') ?? 0);
    });
    await login(failedPage);
    let statusRequests = 0;
    await failedPage.route('**/api/admin/registration-statuses', async (route) => {
      statusRequests += 1;
      if (statusRequests === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'temporary failure' }),
        });
      } else {
        await route.continue();
      }
    });
    await failedPage.goto('/registrations', { waitUntil: 'networkidle' });
    await failedPage.reload({ waitUntil: 'networkidle' });
    expect(statusRequests).toBeGreaterThanOrEqual(2);
    await failedPage.close();
  });

  test('dynamic finance data is never served from the reference cache', async ({
    page,
  }) => {
    await login(page);
    const financeRequests: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() === 'GET' &&
        pathOf(request.url()) === '/api/admin/finance/dashboard'
      ) {
        financeRequests.push(request.url());
      }
    });

    await page.goto('/finance/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    expect(financeRequests).toHaveLength(2);
    const cacheStats = await page.evaluate(
      () => (window as Window & { __KAFI_CACHE__?: { lastEvent?: { key: string } } }).__KAFI_CACHE__,
    );
    expect(cacheStats?.lastEvent?.key ?? '').not.toContain('finance');
  });
});
