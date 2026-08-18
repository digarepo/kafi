import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = process.env.KAFI_API_URL ?? 'http://localhost:4000';
const endpoint = process.env.KAFI_CONCURRENCY_ENDPOINT ?? '/api/admin/dashboard';
const concurrency = Number(process.env.KAFI_CONCURRENCY ?? process.argv[2] ?? 10);
const durationSeconds = Number(process.env.KAFI_CONCURRENCY_DURATION_SECONDS ?? 10);
const runId =
  process.env.KAFI_BENCHMARK_RUN_ID ??
  `concurrency-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const outputDir = resolve(
  process.cwd(),
  process.env.KAFI_BENCHMARK_OUTPUT ?? 'tmp/phase0-concurrency',
);

if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('KAFI_CONCURRENCY must be a positive integer');
}
if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
  throw new Error('KAFI_CONCURRENCY_DURATION_SECONDS must be positive');
}
if (!process.env.KAFI_BENCHMARK_EMAIL || !process.env.KAFI_BENCHMARK_PASSWORD) {
  throw new Error(
    'KAFI_BENCHMARK_EMAIL and KAFI_BENCHMARK_PASSWORD are required',
  );
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(Math.ceil(sorted.length * fraction) - 1, sorted.length - 1)].toFixed(3));
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: process.env.KAFI_BENCHMARK_EMAIL,
      password: process.env.KAFI_BENCHMARK_PASSWORD,
    }),
  });
  if (!response.ok) throw new Error(`Benchmark login failed: ${response.status}`);
  const payload = (await response.json()) as {
    tokens?: { access_token?: string };
  };
  if (!payload.tokens?.access_token) throw new Error('Benchmark login returned no access token');
  return payload.tokens.access_token;
}

async function main() {
  const token = await login();
  const deadline = Date.now() + durationSeconds * 1000;
  const samples: Array<{
    durationMs: number;
    status: number;
    bytes: number;
    requestId: string | null;
    error?: string;
  }> = [];

  async function worker() {
    while (Date.now() < deadline) {
      const requestId = crypto.randomUUID();
      const startedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            authorization: `Bearer ${token}`,
            'x-request-id': requestId,
          },
        });
        const body = await response.arrayBuffer();
        samples.push({
          durationMs: Number((performance.now() - startedAt).toFixed(3)),
          status: response.status,
          bytes: body.byteLength,
          requestId: response.headers.get('x-request-id') ?? requestId,
        });
      } catch (error) {
        samples.push({
          durationMs: Number((performance.now() - startedAt).toFixed(3)),
          status: 0,
          bytes: 0,
          requestId,
          error: error instanceof Error ? error.name : 'unknown',
        });
      }
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const totalDurationMs = performance.now() - startedAt;
  const durations = samples.map((sample) => sample.durationMs);
  const successful = samples.filter((sample) => sample.status >= 200 && sample.status < 300);
  const failed = samples.length - successful.length;
  const report = {
    benchmarkRunId: runId,
    timestamp: new Date().toISOString(),
    apiBaseUrl: baseUrl,
    endpoint,
    fixtureTier: process.env.KAFI_BENCHMARK_FIXTURE_TIER ?? null,
    concurrency,
    durationSeconds,
    totalDurationMs: Number(totalDurationMs.toFixed(3)),
    requestsAttempted: samples.length,
    successfulRequests: successful.length,
    failedRequests: failed,
    errorRate: samples.length === 0 ? 0 : Number((failed / samples.length).toFixed(6)),
    throughputPerSecond: Number((samples.length / (totalDurationMs / 1000)).toFixed(3)),
    p50Ms: percentile(durations, 0.5),
    p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99),
    maxMs: durations.length ? Math.max(...durations) : null,
    responseBytes: {
      total: samples.reduce((sum, sample) => sum + sample.bytes, 0),
      average: samples.length
        ? Number((samples.reduce((sum, sample) => sum + sample.bytes, 0) / samples.length).toFixed(3))
        : null,
    },
    statuses: [...new Set(samples.map((sample) => sample.status))].sort(),
    sampleErrors: samples.filter((sample) => sample.error).slice(0, 20),
  };

  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, `${runId}-${concurrency}.json`);
  writeFileSync(outputPath, `${JSON.stringify({ ...report, outputPath }, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, outputPath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
