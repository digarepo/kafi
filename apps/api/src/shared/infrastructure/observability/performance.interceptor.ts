import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

import {
  isPerformanceInstrumentationEnabled,
  isVerbosePerformanceInstrumentationEnabled,
  performanceRequestContext,
} from './performance-context.js';
import { currentDatabasePoolMetrics } from './database-performance.js';

export function performanceMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!isPerformanceInstrumentationEnabled()) {
    next();
    return;
  }

  const requestId = request.header('x-request-id') ?? randomUUID();
  const startedAt = process.hrtime.bigint();
  const requestContext = {
    requestId,
    method: request.method,
    route: request.originalUrl.split('?')[0],
    databaseDurationMs: 0,
    databaseQueryCount: 0,
    peakPoolMetrics: currentDatabasePoolMetrics(),
  };

  response.setHeader('x-request-id', requestId);
  response.once('finish', () => {
    if (!isVerbosePerformanceInstrumentationEnabled()) return;

    const totalDurationMs =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const nonDatabaseDurationMs = Math.max(
      totalDurationMs - requestContext.databaseDurationMs,
      0,
    );

    console.info(
      JSON.stringify({
        type: 'kafi.perf.http',
        requestId,
        method: request.method,
        route: request.route?.path ?? requestContext.route,
        status: response.statusCode,
        totalDurationMs: Number(totalDurationMs.toFixed(3)),
        databaseDurationMs: Number(
          requestContext.databaseDurationMs.toFixed(3),
        ),
        databaseQueryCount: requestContext.databaseQueryCount,
        nonDatabaseDurationMs: Number(nonDatabaseDurationMs.toFixed(3)),
        serializationDurationMs: null,
        responseBytes: response.getHeader('content-length') ?? null,
        pool: requestContext.peakPoolMetrics,
      }),
    );
  });

  performanceRequestContext.run(requestContext, next);
}
