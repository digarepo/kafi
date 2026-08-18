import { AsyncLocalStorage } from 'node:async_hooks';

export type PerformanceRequestContext = {
  requestId: string;
  method: string;
  route: string;
  databaseDurationMs: number;
  databaseQueryCount: number;
};

export const performanceRequestContext =
  new AsyncLocalStorage<PerformanceRequestContext>();

export type PerformanceMode = 'OFF' | 'CAPTURE' | 'VERBOSE';

export function getPerformanceMode(): PerformanceMode {
  const configured = (process.env.KAFI_PERF_MODE ?? '').trim().toUpperCase();
  if (configured === 'CAPTURE' || configured === 'VERBOSE') {
    return configured;
  }
  if (process.env.KAFI_PERF_INSTRUMENTATION === 'true') return 'CAPTURE';
  return 'OFF';
}

export function isPerformanceInstrumentationEnabled(): boolean {
  return getPerformanceMode() !== 'OFF';
}

export function isVerbosePerformanceInstrumentationEnabled(): boolean {
  return getPerformanceMode() === 'VERBOSE';
}

export function recordDatabaseQuery(durationMs: number): void {
  const context = performanceRequestContext.getStore();
  if (!context) return;
  context.databaseDurationMs += durationMs;
  context.databaseQueryCount += 1;
}

export function currentPerformanceRequestId(): string | null {
  return performanceRequestContext.getStore()?.requestId ?? null;
}
