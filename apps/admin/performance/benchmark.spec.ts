import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { test, type Page, type TestInfo } from '@playwright/test';

type RunCapture = {
  route: string;
  cacheState: 'cold' | 'warm';
  metrics: Record<string, unknown>;
  requests: Array<Record<string, unknown>>;
  apiRequests: Array<Record<string, unknown>>;
  duplicateApiRequests: Array<Record<string, unknown>>;
  consoleErrors: string[];
};

type BrowserCaptureApi = {
  reset: () => void;
  snapshot: () => Record<string, unknown>;
};

type BenchmarkWindow = Window & {
  __KAFI_BENCHMARK__?: BrowserCaptureApi;
};

const benchmarkEmail = process.env.KAFI_BENCHMARK_EMAIL;
const benchmarkPassword = process.env.KAFI_BENCHMARK_PASSWORD;
const configuredRoutes =
  process.env.KAFI_BENCHMARK_ROUTES ??
  '/,/finance/dashboard,/registrations,/travel-groups';
const routes = configuredRoutes
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const runId =
  process.env.KAFI_BENCHMARK_RUN_ID ??
  `browser-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const outputDir = resolve(
  process.cwd(),
  process.env.KAFI_BENCHMARK_OUTPUT ?? 'tmp/phase0-browser',
);

const benchmarkInitScript = () => {
  const state = {
    lcp: null as number | null,
    cls: 0,
    longTaskDuration: 0,
    longTaskCount: 0,
    inp: null as number | null,
  };

  const observe = (
    type: string,
    callback: (entry: PerformanceEntry) => void,
  ) => {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) callback(entry);
      });
      observer.observe({ type, buffered: true });
    } catch {
      // Metric is unavailable in this browser.
    }
  };

  observe('largest-contentful-paint', (entry) => {
    state.lcp = entry.startTime;
  });
  observe('layout-shift', (entry) => {
    const value = entry as PerformanceEntry & {
      hadRecentInput?: boolean;
      value?: number;
    };
    if (!value.hadRecentInput) state.cls += value.value ?? 0;
  });
  observe('longtask', (entry) => {
    state.longTaskDuration += Math.max(entry.duration - 50, 0);
    state.longTaskCount += 1;
  });
  observe('event', (entry) => {
    const value = entry as PerformanceEntry & { duration?: number };
    if (value.duration !== undefined) {
      state.inp = Math.max(state.inp ?? 0, value.duration);
    }
  });

  (window as BenchmarkWindow).__KAFI_BENCHMARK__ = {
    reset() {
      state.lcp = null;
      state.cls = 0;
      state.longTaskDuration = 0;
      state.longTaskCount = 0;
      state.inp = null;
      performance.clearResourceTimings();
      performance.clearMarks();
      performance.clearMeasures();
    },
    snapshot() {
      const navigation = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      const paints = performance.getEntriesByType('paint');
      const resources = performance
        .getEntriesByType('resource')
        .map((entry) => {
          const value = entry as PerformanceResourceTiming;
          const url = new URL(value.name);
          url.search = '';
          return {
            name: `${url.pathname}${url.hash}`,
            initiatorType: value.initiatorType,
            startTime: value.startTime,
            duration: value.duration,
            transferSize: value.transferSize,
            encodedBodySize: value.encodedBodySize,
            decodedBodySize: value.decodedBodySize,
          };
        });
      return {
        fcp:
          paints.find((entry) => entry.name === 'first-contentful-paint')
            ?.startTime ?? null,
        lcp: state.lcp,
        cls: state.cls,
        tbt: state.longTaskDuration,
        inp: state.inp,
        speedIndex: null,
        speedIndexNote:
          'Requires Lighthouse/filmstrip measurement; browser timing API does not expose Speed Index.',
        longTaskCount: state.longTaskCount,
        navigation: navigation
          ? {
              ttfb: navigation.responseStart,
              domContentLoaded: navigation.domContentLoadedEventEnd,
              loadEvent: navigation.loadEventEnd,
              transferSize: navigation.transferSize,
              encodedBodySize: navigation.encodedBodySize,
              decodedBodySize: navigation.decodedBodySize,
            }
          : null,
        resources,
      };
    },
  };
};

async function login(page: Page) {
  if (!benchmarkEmail || !benchmarkPassword) {
    throw new Error(
      'KAFI_BENCHMARK_EMAIL and KAFI_BENCHMARK_PASSWORD are required',
    );
  }
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(benchmarkEmail);
  await page.locator('#password').fill(benchmarkPassword);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/$/, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
}

function routeName(route: string) {
  return route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
}

function writeCapture(testInfo: TestInfo, capture: RunCapture) {
  mkdirSync(outputDir, { recursive: true });
  const project = testInfo.project.name;
  const path = resolve(
    outputDir,
    `${runId}-${project}-${routeName(capture.route)}-${capture.cacheState}.json`,
  );
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        benchmarkRunId: runId,
        timestamp: new Date().toISOString(),
        commit:
          process.env.GITHUB_SHA ?? process.env.KAFI_BENCHMARK_COMMIT ?? null,
        fixtureTier: process.env.KAFI_BENCHMARK_FIXTURE_TIER ?? null,
        project,
        ...capture,
        outputPath: path,
      },
      null,
      2,
    )}\n`,
  );
}

async function captureRoute(
  page: Page,
  route: string,
  cacheState: 'cold' | 'warm',
  testInfo: TestInfo,
) {
  const requests: Array<Record<string, unknown>> = [];
  const apiRequestsById = new Map<string, Record<string, unknown>>();
  const browserRequests = new Map<
    import('@playwright/test').Request,
    Record<string, unknown>
  >();
  const consoleErrors: string[] = [];
  const startedAt = Date.now();

  const onRequest = (request: import('@playwright/test').Request) => {
    const url = new URL(request.url());
    url.search = '';
    const requestId = request.headers()['x-request-id'] ?? null;
    const record = {
      timestamp: new Date().toISOString(),
      method: request.method(),
      path: url.pathname,
      resourceType: request.resourceType(),
      requestId,
      startOffsetMs: Date.now() - startedAt,
    };
    requests.push(record);
    if (requestId) apiRequestsById.set(requestId, record);
    else browserRequests.set(request, record);
  };
  const onResponse = async (response: import('@playwright/test').Response) => {
    const request = response.request();
    const requestId =
      response.headers()['x-request-id'] ??
      request.headers()['x-request-id'] ??
      null;
    const record = requestId
      ? apiRequestsById.get(requestId)
      : browserRequests.get(request);
    if (!record) return;
    Object.assign(record, {
      status: response.status(),
      requestId,
      contentLength: response.headers()['content-length'] ?? null,
      durationMs: Number((Date.now() - startedAt).toFixed(3)),
    });
  };
  const onRequestFailed = (request: import('@playwright/test').Request) => {
    const requestId = request.headers()['x-request-id'] ?? null;
    const record = requestId
      ? apiRequestsById.get(requestId)
      : browserRequests.get(request);
    if (!record) return;
    Object.assign(record, {
      requestId,
      failed: request.failure()?.errorText ?? 'unknown',
    });
  };
  const onConsole = (message: import('@playwright/test').ConsoleMessage) => {
    if (message.type() === 'error')
      consoleErrors.push(message.text().slice(0, 500));
  };

  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);
  page.on('console', onConsole);

  await page.evaluate(() => {
    (window as BenchmarkWindow).__KAFI_BENCHMARK__?.reset();
  });
  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(
    Number(process.env.KAFI_BENCHMARK_SETTLE_MS ?? 750),
  );

  const metrics = await page.evaluate(
    () => (window as BenchmarkWindow).__KAFI_BENCHMARK__?.snapshot() ?? {},
  );
  const apiRequests = requests.filter((request) =>
    String(request.path).startsWith('/api/'),
  );
  const grouped = new Map<string, number>();
  for (const request of apiRequests) {
    if (request.method !== 'GET' || request.status === undefined) continue;
    const key = `${request.method} ${request.path}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  const duplicateApiRequests = [...grouped.entries()]
    .filter(([, count]) => count > 1)
    .map(([request, count]) => ({ request, count }));

  const capture: RunCapture = {
    route,
    cacheState,
    metrics,
    requests,
    apiRequests,
    duplicateApiRequests,
    consoleErrors,
  };
  writeCapture(testInfo, capture);

  page.off('request', onRequest);
  page.off('response', onResponse);
  page.off('requestfailed', onRequestFailed);
  page.off('console', onConsole);
}

test.describe('Phase 0 Admin benchmark', () => {
  for (const route of routes) {
    test(`${route} cold and warm traces`, async ({ page }, testInfo) => {
      await page.addInitScript(benchmarkInitScript);
      await login(page);
      await captureRoute(page, route, 'cold', testInfo);
      await captureRoute(page, route, 'warm', testInfo);
    });
  }
});
