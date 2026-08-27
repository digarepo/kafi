import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

const adminUrl = process.env.KAFI_ADMIN_URL ?? 'http://localhost:3000';
const route = process.env.KAFI_LIGHTHOUSE_ROUTE ?? '/';
const formFactor =
  process.env.KAFI_LIGHTHOUSE_FORM_FACTOR === 'desktop' ? 'desktop' : 'mobile';
const port = Number(process.env.KAFI_LIGHTHOUSE_PORT ?? 9222);
const throttled = process.env.KAFI_LIGHTHOUSE_THROTTLED === 'true';
const profileDir = resolve(
  process.cwd(),
  process.env.KAFI_LIGHTHOUSE_PROFILE_DIR ?? 'tmp/phase0-lighthouse-profile',
);
const outputDir = resolve(
  process.cwd(),
  process.env.KAFI_BENCHMARK_OUTPUT ?? 'tmp/phase0-browser',
);

if (!process.env.KAFI_BENCHMARK_EMAIL || !process.env.KAFI_BENCHMARK_PASSWORD) {
  throw new Error(
    'KAFI_BENCHMARK_EMAIL and KAFI_BENCHMARK_PASSWORD are required',
  );
}

async function ensureAuthenticated(
  context: Awaited<ReturnType<typeof chromium.launchPersistentContext>>,
) {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${adminUrl}/login`, { waitUntil: 'domcontentloaded' });
  if (page.url().includes('/login')) {
    await page.locator('#email').fill(process.env.KAFI_BENCHMARK_EMAIL!);
    await page.locator('#password').fill(process.env.KAFI_BENCHMARK_PASSWORD!);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/$/, { waitUntil: 'networkidle' });
  }
  await page.goto(`${adminUrl}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(
    Number(process.env.KAFI_BENCHMARK_SETTLE_MS ?? 750),
  );
}

async function main() {
  mkdirSync(profileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    args: [`--remote-debugging-port=${port}`],
    viewport:
      formFactor === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    deviceScaleFactor: formFactor === 'mobile' ? 3 : 1,
    isMobile: formFactor === 'mobile',
  });

  try {
    await ensureAuthenticated(context);
    const result = await lighthouse(`${adminUrl}${route}`, {
      port,
      output: 'json',
      logLevel: 'error',
      disableStorageReset: true,
      onlyCategories: ['performance'],
      formFactor,
      screenEmulation:
        formFactor === 'mobile'
          ? { mobile: true, width: 390, height: 844, deviceScaleFactor: 3 }
          : { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1 },
      ...(throttled && formFactor === 'mobile'
        ? {
            throttlingMethod: 'simulate' as const,
            throttling: {
              rttMs: 150,
              throughputKbps: 1638.4,
              requestLatencyMs: 150,
              downloadThroughputKbps: 1638.4,
              uploadThroughputKbps: 675,
              cpuSlowdownMultiplier: 4,
            },
          }
        : {}),
    });
    if (!result?.lhr) throw new Error('Lighthouse returned no report');

    const { lhr } = result;
    const report = {
      benchmarkRunId:
        process.env.KAFI_BENCHMARK_RUN_ID ?? `lighthouse-${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminUrl,
      route,
      formFactor,
      throttled: throttled && formFactor === 'mobile',
      throttlingProfile:
        throttled && formFactor === 'mobile'
          ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 4,
            }
          : null,
      fixtureTier: process.env.KAFI_BENCHMARK_FIXTURE_TIER ?? null,
      lighthouseVersion: lhr.lighthouseVersion,
      score: lhr.categories.performance?.score ?? null,
      metrics: {
        firstContentfulPaint:
          lhr.audits['first-contentful-paint']?.numericValue ?? null,
        largestContentfulPaint:
          lhr.audits['largest-contentful-paint']?.numericValue ?? null,
        totalBlockingTime:
          lhr.audits['total-blocking-time']?.numericValue ?? null,
        cumulativeLayoutShift:
          lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
        speedIndex: lhr.audits['speed-index']?.numericValue ?? null,
        interactive: lhr.audits.interactive?.numericValue ?? null,
        serverResponseTime:
          lhr.audits['server-response-time']?.numericValue ?? null,
      },
      resourceSummary: lhr.audits['resource-summary']?.details ?? null,
    };
    const outputPath = resolve(
      outputDir,
      `${report.benchmarkRunId}-${formFactor}-${route.replace(/[^a-z0-9]+/gi, '-') || 'root'}.lighthouse.json`,
    );
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      outputPath,
      `${JSON.stringify({ ...report, outputPath }, null, 2)}\n`,
    );
    console.log(JSON.stringify({ ...report, outputPath }, null, 2));
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
