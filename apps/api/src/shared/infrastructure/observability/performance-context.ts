import { AsyncLocalStorage } from 'node:async_hooks';

export type PoolMetrics = {
  totalConnections: number | null;
  freeConnections: number | null;
  activeConnections: number | null;
  waitingRequests: number | null;
};

export type PerformanceRequestContext = {
  requestId: string;
  method: string;
  route: string;
  databaseDurationMs: number;
  databaseQueryCount: number;
  peakPoolMetrics: PoolMetrics | null;
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

export function recordPoolMetrics(metrics: PoolMetrics | null): void {
  const context = performanceRequestContext.getStore();
  if (!context || !metrics) return;

  const previous = context.peakPoolMetrics;
  if (!previous) {
    context.peakPoolMetrics = { ...metrics };
    return;
  }

  context.peakPoolMetrics = {
    totalConnections: metrics.totalConnections ?? previous.totalConnections,
    freeConnections:
      previous.freeConnections === null || metrics.freeConnections === null
        ? (metrics.freeConnections ?? previous.freeConnections)
        : Math.min(previous.freeConnections, metrics.freeConnections),
    activeConnections:
      previous.activeConnections === null || metrics.activeConnections === null
        ? (metrics.activeConnections ?? previous.activeConnections)
        : Math.max(previous.activeConnections, metrics.activeConnections),
    waitingRequests:
      previous.waitingRequests === null || metrics.waitingRequests === null
        ? (metrics.waitingRequests ?? previous.waitingRequests)
        : Math.max(previous.waitingRequests, metrics.waitingRequests),
  };
}

export function currentPerformanceRequestId(): string | null {
  return performanceRequestContext.getStore()?.requestId ?? null;
}
