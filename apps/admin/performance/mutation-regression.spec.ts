import { test, expect, type Page } from '@playwright/test';

const apiUrl = process.env.KAFI_API_URL ?? 'http://localhost:4000';
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

function apiPath(url: string) {
  const parsed = new URL(url);
  return parsed.pathname;
}

test.describe('Phase 3 mutation revalidation', () => {
  test.skip(
    process.env.KAFI_MUTATION_REGRESSION !== 'true',
    'Requires an isolated fixture database and explicit cleanup permission',
  );

  test('package template creation refreshes templates without versions', async ({
    page,
    request,
  }) => {
    await login(page);
    await page.goto('/packages', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const requestPaths: string[] = [];
    const onRequest = (requestEvent: import('@playwright/test').Request) => {
      const path = apiPath(requestEvent.url());
      if (path.startsWith('/api/')) {
        requestPaths.push(`${requestEvent.method()} ${path}`);
      }
    };
    page.on('request', onRequest);

    const name = `Phase 3 Mutation ${Date.now()}`;
    await page.getByRole('button', { name: /add template/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await dialog.getByLabel('Short name').fill('P3');
    await dialog.getByLabel('Default duration (days)').fill('14');

    const selects = dialog.getByRole('combobox');
    await selects.nth(0).click();
    await page.getByRole('option').first().click();
    await selects.nth(1).click();
    await page.getByRole('option').first().click();
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        apiPath(response.url()) === '/api/admin/package-templates',
    );
    await dialog.getByRole('button', { name: /create template/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status(), await createResponse.text()).toBeLessThan(
      300,
    );

    await expect(dialog).toBeHidden();
    await expect(page.getByText(name)).toBeVisible();
    await page.waitForTimeout(500);

    expect(requestPaths).toContain('POST /api/admin/package-templates');
    expect(requestPaths).toContain('GET /api/admin/package-templates');
    expect(requestPaths).not.toContain('GET /api/admin/package-versions');

    await page.getByRole('tab', { name: 'Versions' }).click();
    await page.waitForTimeout(500);
    expect(requestPaths).toContain('GET /api/admin/package-versions');

    page.off('request', onRequest);

    const accessToken = await page.evaluate(
      () =>
        localStorage.getItem('kafi_access_token') ??
        sessionStorage.getItem('kafi_access_token'),
    );
    expect(accessToken).toBeTruthy();

    const listResponse = await request.get(
      `${apiUrl}/api/admin/package-templates?page=1&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const listBody = (await listResponse.json()) as {
      data?: Array<{ id: string; name: string }>;
    };
    const createdTemplateId = listBody.data?.find(
      (item) => item.name === name,
    )?.id;
    expect(createdTemplateId).toBeTruthy();

    const cleanup = await request.post(
      `${apiUrl}/api/admin/package-templates/${createdTemplateId}/archive`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(cleanup.status(), await cleanup.text()).toBeLessThan(300);
  });
});
