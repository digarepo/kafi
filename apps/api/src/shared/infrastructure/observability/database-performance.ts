import {
  currentPerformanceRequestId,
  isVerbosePerformanceInstrumentationEnabled,
  recordDatabaseQuery,
  recordPoolMetrics,
  type PoolMetrics,
} from './performance-context.js';

let instrumentedPool: object | null = null;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof value.then === 'function'
  );
}

function queryText(value: unknown): string {
  const raw =
    typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null && 'sql' in value
        ? String(value.sql)
        : String(value);
  return raw
    .replace(/\s+/g, ' ')
    .replace(/'[^']*'/g, "'?'")
    .replace(/\b\d+(?:\.\d+)?\b/g, '?')
    .slice(0, 1200);
}

function resultRowCount(value: unknown): number | null {
  if (Array.isArray(value) && Array.isArray(value[0])) {
    return value[0].length;
  }
  if (typeof value === 'object' && value !== null && 'affectedRows' in value) {
    return Number(value.affectedRows);
  }
  return null;
}

function collectionLength(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !('length' in value)) {
    return null;
  }
  const length = (value as { length?: unknown }).length;
  return typeof length === 'number' ? length : null;
}

export function currentDatabasePoolMetrics(): PoolMetrics | null {
  if (!instrumentedPool) return null;
  const pool = ((instrumentedPool as { pool?: object }).pool ??
    instrumentedPool) as Record<string, unknown>;
  const totalConnections = collectionLength(pool._allConnections);
  const freeConnections = collectionLength(pool._freeConnections);
  const waitingRequests = collectionLength(pool._connectionQueue);
  return {
    totalConnections,
    freeConnections,
    activeConnections:
      totalConnections !== null && freeConnections !== null
        ? Math.max(totalConnections - freeConnections, 0)
        : null,
    waitingRequests,
  };
}

function recordQuery(
  label: string,
  args: unknown[],
  startedAt: bigint,
  result: unknown,
  error?: unknown,
): void {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  recordDatabaseQuery(durationMs);
  recordPoolMetrics(currentDatabasePoolMetrics());
  if (!isVerbosePerformanceInstrumentationEnabled()) return;

  console.info(
    JSON.stringify({
      type: 'kafi.perf.db',
      requestId: currentPerformanceRequestId(),
      client: label,
      query: queryText(args[0]),
      durationMs: Number(durationMs.toFixed(3)),
      rowCount: error ? null : resultRowCount(result),
      error: error instanceof Error ? error.name : error ? 'unknown' : null,
    }),
  );
}

function wrapClient<T extends object>(client: T, label: string): T {
  return new Proxy(client, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (
        property !== 'query' &&
        property !== 'execute' &&
        property !== 'getConnection'
      ) {
        return value;
      }

      if (typeof value !== 'function') return value;
      const invoke = value as (...args: unknown[]) => unknown;

      if (property === 'getConnection') {
        return (...args: unknown[]) => {
          const result = Reflect.apply(invoke, target, args);
          if (!isPromiseLike(result)) return result;
          return result.then((connection) =>
            connection && typeof connection === 'object'
              ? wrapClient(connection, `${label}.connection`)
              : connection,
          );
        };
      }

      return (...args: unknown[]) => {
        const startedAt = process.hrtime.bigint();
        try {
          const result = Reflect.apply(invoke, target, args);
          if (!isPromiseLike(result)) {
            recordQuery(label, args, startedAt, result);
            return result;
          }
          return result.then(
            (resolved) => {
              recordQuery(label, args, startedAt, resolved);
              return resolved;
            },
            (error) => {
              recordQuery(label, args, startedAt, undefined, error);
              throw error;
            },
          );
        } catch (error) {
          recordQuery(label, args, startedAt, undefined, error);
          throw error;
        }
      };
    },
  });
}

export function instrumentDatabasePool<T extends object>(pool: T): T {
  instrumentedPool = pool;
  return wrapClient(pool, 'pool');
}
