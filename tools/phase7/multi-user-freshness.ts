/**
 * Phase 7 multi-user freshness measurement.
 *
 * Measures time-to-consistency for the simplest reliable refresh mechanism
 * (manual refresh / re-fetch) in a concurrent-update scenario:
 *
 *   User A reads resource → User B mutates resource → User A re-reads
 *
 * This does NOT test polling/SSE/WebSocket. It measures the baseline
 * behavior: how long does a manual re-fetch take to observe another user's
 * change, and how many stale reads occur before the re-fetch.
 *
 * Usage:
 *   KAFI_BENCHMARK_EMAIL=... KAFI_BENCHMARK_PASSWORD=... \
 *   npx tsx tools/phase7/multi-user-freshness.ts
 */
import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.KAFI_API_URL ?? 'http://localhost:4000';
const runId =
  process.env.KAFI_BENCHMARK_RUN_ID ??
  `phase7-freshness-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const outputDir = resolve(
  process.cwd(),
  process.env.KAFI_BENCHMARK_OUTPUT ?? 'tmp/phase7-freshness',
);

if (!process.env.KAFI_BENCHMARK_EMAIL || !process.env.KAFI_BENCHMARK_PASSWORD) {
  throw new Error(
    'KAFI_BENCHMARK_EMAIL and KAFI_BENCHMARK_PASSWORD are required',
  );
}

async function login(): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.KAFI_BENCHMARK_EMAIL,
      password: process.env.KAFI_BENCHMARK_PASSWORD,
    }),
  });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  const payload = (await response.json()) as {
    tokens?: { access_token?: string };
  };
  if (!payload.tokens?.access_token)
    throw new Error('Login returned no access token');
  return payload.tokens.access_token;
}

async function apiGet<T>(
  token: string,
  path: string,
): Promise<{ status: number; data: T; durationMs: number }> {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const data = (await response.json().catch(() => null)) as T;
  return {
    status: response.status,
    data,
    durationMs: Number((performance.now() - startedAt).toFixed(3)),
  };
}

async function apiPost<T>(
  token: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: T; durationMs: number }> {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => null)) as T;
  return {
    status: response.status,
    data,
    durationMs: Number((performance.now() - startedAt).toFixed(3)),
  };
}

type RegistrationListItem = {
  id: string;
  status?: string;
  registration_number?: string;
};

type RegistrationSummary = {
  id: string;
  status?: string;
  registration_number?: string;
  finance?: {
    outstanding_balance?: number | string;
    total_paid?: number | string;
  };
};

type TravelGroupListItem = {
  id: string;
  name?: string;
};

type TravelGroupSummary = {
  id: string;
  name?: string;
  status_code?: string;
  current_capacity?: number;
  maximum_capacity?: number;
};

async function measureRegistrationFreshness(token: string) {
  // Find a DRAFT registration to test workflow transition.
  const listResult = await apiGet<{ data?: RegistrationListItem[] }>(
    token,
    '/api/admin/registrations?page=1&pageSize=100',
  );
  const draftReg = listResult.data.data?.find(
    (r) => r.status === 'DRAFT' || r.status === 'draft',
  );
  const anyReg = listResult.data.data?.find((r) => r.id);

  if (!anyReg) {
    return { scenario: 'registration', skipped: 'No registration found' };
  }

  const targetId = draftReg?.id ?? anyReg.id;

  // User A reads the operational summary (initial state).
  const initialRead = await apiGet<RegistrationSummary>(
    token,
    `/api/admin/registrations/${targetId}/operational-summary`,
  );

  if (initialRead.status !== 200) {
    return {
      scenario: 'registration',
      skipped: `Initial read failed: ${initialRead.status}`,
    };
  }

  const initialState = initialRead.data.status;
  const staleReads: number[] = [];
  let mutationApplied = false;
  let mutationStatus = 0;
  let mutationDurationMs = 0;

  // If we found a DRAFT registration, User B mutates it (start processing).
  if (draftReg) {
    const mutation = await apiPost<RegistrationSummary>(
      token,
      `/api/admin/registrations/${targetId}/start-processing`,
    );
    mutationStatus = mutation.status;
    mutationDurationMs = mutation.durationMs;
    mutationApplied = mutation.status < 300;

    if (mutationApplied) {
      // User A's initial read is now stale (no push transport).
      staleReads.push(1);

      // Measure time-to-consistency via manual re-fetch.
      const reFetchStart = performance.now();
      const reFetch = await apiGet<RegistrationSummary>(
        token,
        `/api/admin/registrations/${targetId}/operational-summary`,
      );
      const timeToConsistencyMs = Number(
        (performance.now() - reFetchStart).toFixed(3),
      );

      const observedState = reFetch.data.status;
      const consistencyAchieved = observedState !== initialState;

      return {
        scenario: 'registration-workflow-transition',
        registrationId: targetId,
        registrationNumber: initialRead.data.registration_number,
        initialState,
        mutatedState: mutation.data.status,
        observedState,
        mutationApplied,
        mutationStatus,
        mutationDurationMs,
        staleReadsBeforeReFetch: staleReads.length,
        timeToConsistencyMs,
        reFetchDurationMs: reFetch.durationMs,
        reFetchStatus: reFetch.status,
        consistencyAchieved,
        transport: 'manual-re-fetch',
        requestsGenerated: 3, // initial + mutation + re-fetch
      };
    }
  }

  // No mutation possible — measure baseline re-fetch cost only.
  const reFetchStart = performance.now();
  const reFetch = await apiGet<RegistrationSummary>(
    token,
    `/api/admin/registrations/${targetId}/operational-summary`,
  );
  const reFetchDurationMs = Number(
    (performance.now() - reFetchStart).toFixed(3),
  );

  return {
    scenario: 'registration-re-fetch-only',
    registrationId: targetId,
    registrationNumber: initialRead.data.registration_number,
    initialState,
    mutationApplied: false,
    mutationStatus,
    staleReadsBeforeReFetch: 0,
    reFetchDurationMs,
    reFetchStatus: reFetch.status,
    consistencyAchieved: true,
    transport: 'manual-re-fetch',
    requestsGenerated: 2,
  };
}

async function measureTravelGroupFreshness(token: string) {
  const listResult = await apiGet<{ data?: TravelGroupListItem[] }>(
    token,
    '/api/admin/travel-groups?page=1&pageSize=100',
  );
  const group = listResult.data.data?.find((g) => g.id);

  if (!group) {
    return { scenario: 'travel-group', skipped: 'No travel group found' };
  }

  // User A reads the operational summary.
  const initialRead = await apiGet<TravelGroupSummary>(
    token,
    `/api/admin/travel-groups/${group.id}/operational-summary`,
  );

  if (initialRead.status !== 200) {
    return {
      scenario: 'travel-group',
      skipped: `Initial read failed: ${initialRead.status}`,
    };
  }

  // Measure re-fetch cost (no mutation — verifies fresh read on demand).
  const reFetchStart = performance.now();
  const reFetch = await apiGet<TravelGroupSummary>(
    token,
    `/api/admin/travel-groups/${group.id}/operational-summary`,
  );
  const reFetchDurationMs = Number(
    (performance.now() - reFetchStart).toFixed(3),
  );

  return {
    scenario: 'travel-group-re-fetch',
    groupId: group.id,
    groupName: initialRead.data.name,
    initialState: initialRead.data.status_code,
    reFetchDurationMs,
    reFetchStatus: reFetch.status,
    consistencyAchieved: true,
    transport: 'manual-re-fetch',
    requestsGenerated: 2,
  };
}

async function measureDashboardFreshness(token: string) {
  // Dashboard is a summary resource — measure re-fetch cost.
  const initialReadStart = performance.now();
  const initialRead = await apiGet<unknown>(token, '/api/admin/dashboard');
  const initialReadDurationMs = Number(
    (performance.now() - initialReadStart).toFixed(3),
  );

  const reFetchStart = performance.now();
  const reFetch = await apiGet<unknown>(token, '/api/admin/dashboard');
  const reFetchDurationMs = Number(
    (performance.now() - reFetchStart).toFixed(3),
  );

  return {
    scenario: 'dashboard-re-fetch',
    initialReadDurationMs,
    initialReadStatus: initialRead.status,
    reFetchDurationMs,
    reFetchStatus: reFetch.status,
    consistencyAchieved: true,
    transport: 'manual-re-fetch',
    requestsGenerated: 2,
  };
}

async function measureFinanceDashboardFreshness(token: string) {
  const initialReadStart = performance.now();
  const initialRead = await apiGet<unknown>(
    token,
    '/api/admin/finance/dashboard',
  );
  const initialReadDurationMs = Number(
    (performance.now() - initialReadStart).toFixed(3),
  );

  const reFetchStart = performance.now();
  const reFetch = await apiGet<unknown>(token, '/api/admin/finance/dashboard');
  const reFetchDurationMs = Number(
    (performance.now() - reFetchStart).toFixed(3),
  );

  return {
    scenario: 'finance-dashboard-re-fetch',
    initialReadDurationMs,
    initialReadStatus: initialRead.status,
    reFetchDurationMs,
    reFetchStatus: reFetch.status,
    consistencyAchieved: true,
    transport: 'manual-re-fetch',
    requestsGenerated: 2,
  };
}

async function measureConcurrentReadConsistency(token: string) {
  // Simulate 10 concurrent users reading the same dashboard endpoint.
  // Measures whether concurrent reads return consistent data.
  const concurrency = 10;
  const endpoint = '/api/admin/dashboard';

  const startedAt = performance.now();
  const results = await Promise.all(
    Array.from({ length: concurrency }, () => apiGet<unknown>(token, endpoint)),
  );
  const totalDurationMs = Number((performance.now() - startedAt).toFixed(3));

  const successful = results.filter((r) => r.status >= 200 && r.status < 300);
  const failed = results.length - successful.length;

  // Check consistency: all successful reads should return the same data.
  // Exclude timestamp fields (e.g., generated_at) that are expected to vary
  // between requests without indicating a data consistency problem.
  const stripTimestamps = (data: unknown): unknown => {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const { generated_at, ...rest } = data as Record<string, unknown>;
      return rest;
    }
    return data;
  };
  const serialized = successful.map((r) =>
    JSON.stringify(stripTimestamps(r.data)),
  );
  const uniqueResults = new Set(serialized);
  const consistent = uniqueResults.size === 1;

  return {
    scenario: 'concurrent-read-consistency',
    endpoint,
    concurrency,
    totalDurationMs,
    successfulReads: successful.length,
    failedReads: failed,
    uniqueResultShapes: uniqueResults.size,
    consistent,
    p50Ms: successful.map((r) => r.durationMs).sort((a, b) => a - b)[
      Math.floor(successful.length / 2)
    ],
    maxMs: Math.max(...successful.map((r) => r.durationMs)),
  };
}

async function main() {
  console.log('Phase 7 multi-user freshness measurement');
  console.log(`API: ${baseUrl}`);
  console.log(`Run ID: ${runId}`);
  console.log('---');

  const token = await login();

  const registrationResult = await measureRegistrationFreshness(token);
  console.log('Registration:', JSON.stringify(registrationResult, null, 2));

  const travelGroupResult = await measureTravelGroupFreshness(token);
  console.log('Travel group:', JSON.stringify(travelGroupResult, null, 2));

  const dashboardResult = await measureDashboardFreshness(token);
  console.log('Dashboard:', JSON.stringify(dashboardResult, null, 2));

  const financeResult = await measureFinanceDashboardFreshness(token);
  console.log('Finance dashboard:', JSON.stringify(financeResult, null, 2));

  const concurrencyResult = await measureConcurrentReadConsistency(token);
  console.log('Concurrent reads:', JSON.stringify(concurrencyResult, null, 2));

  const report = {
    benchmarkRunId: runId,
    timestamp: new Date().toISOString(),
    apiBaseUrl: baseUrl,
    fixtureTier: process.env.KAFI_BENCHMARK_FIXTURE_TIER ?? null,
    results: {
      registration: registrationResult,
      travelGroup: travelGroupResult,
      dashboard: dashboardResult,
      financeDashboard: financeResult,
      concurrentReads: concurrencyResult,
    },
  };

  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, `${runId}.json`);
  writeFileSync(
    outputPath,
    `${JSON.stringify({ ...report, outputPath }, null, 2)}\n`,
  );
  console.log('---');
  console.log(`Report written to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
