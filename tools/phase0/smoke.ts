import 'dotenv/config';

const apiUrl = process.env.KAFI_SMOKE_API_URL ?? 'http://localhost:4000';
const adminUrl = process.env.KAFI_SMOKE_ADMIN_URL ?? 'http://localhost:3000';
const requireAuth = process.env.KAFI_SMOKE_REQUIRE_AUTH === 'true';

type Check = {
  name: string;
  url?: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  httpStatus?: number;
  durationMs?: number;
  detail?: string;
};

const checks: Check[] = [];

async function check(name: string, url: string, expected: number[] = [200]) {
  const startedAt = performance.now();
  try {
    const response = await fetch(url);
    const durationMs = Number((performance.now() - startedAt).toFixed(3));
    const status = expected.includes(response.status) ? 'PASS' : 'FAIL';
    await response.arrayBuffer();
    checks.push({ name, url, status, httpStatus: response.status, durationMs });
    return response;
  } catch (error) {
    checks.push({
      name,
      url,
      status: 'FAIL',
      durationMs: Number((performance.now() - startedAt).toFixed(3)),
      detail: error instanceof Error ? error.name : 'unknown',
    });
    return null;
  }
}

async function main() {
  await check('api-liveness', `${apiUrl}/api/health/live`);
  await check('api-readiness', `${apiUrl}/api/health/ready`);

  const adminResponse = await check('admin-document', adminUrl);
  if (adminResponse?.ok) {
    const html = await (await fetch(adminUrl)).text();
    const asset = html.match(/(?:src|href)="(\/assets\/[^"?]+)"/)?.[1];
    if (asset) {
      await check('admin-static-asset', `${adminUrl}${asset}`);
    } else {
      checks.push({
        name: 'admin-static-asset',
        status: 'FAIL',
        detail: 'No generated /assets resource found in Admin document',
      });
    }
  }

  const email = process.env.KAFI_SMOKE_EMAIL;
  const password = process.env.KAFI_SMOKE_PASSWORD;
  if (!email || !password) {
    checks.push({
      name: 'authenticated-api-smoke',
      status: requireAuth ? 'FAIL' : 'SKIP',
      detail: requireAuth
        ? 'KAFI_SMOKE_EMAIL and KAFI_SMOKE_PASSWORD are required'
        : 'Credentials not configured',
    });
  } else {
    const startedAt = performance.now();
    try {
      const login = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await login.json().catch(() => ({}))) as {
        tokens?: { access_token?: string };
      };
      if (!login.ok || !payload.tokens?.access_token) {
        checks.push({
          name: 'authenticated-api-smoke',
          status: 'FAIL',
          httpStatus: login.status,
          durationMs: Number((performance.now() - startedAt).toFixed(3)),
          detail: 'Login failed or returned no access token',
        });
      } else {
        const me = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { authorization: `Bearer ${payload.tokens.access_token}` },
        });
        await me.arrayBuffer();
        checks.push({
          name: 'authenticated-api-smoke',
          status: me.ok ? 'PASS' : 'FAIL',
          httpStatus: me.status,
          durationMs: Number((performance.now() - startedAt).toFixed(3)),
        });
      }
    } catch (error) {
      checks.push({
        name: 'authenticated-api-smoke',
        status: 'FAIL',
        durationMs: Number((performance.now() - startedAt).toFixed(3)),
        detail: error instanceof Error ? error.name : 'unknown',
      });
    }
  }

  const failed = checks.filter((check) => check.status === 'FAIL');
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    apiUrl,
    adminUrl,
    checks,
    passed: checks.filter((check) => check.status === 'PASS').length,
    skipped: checks.filter((check) => check.status === 'SKIP').length,
    failed: failed.length,
  }, null, 2));

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
