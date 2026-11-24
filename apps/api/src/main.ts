import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { ConfigService } from './shared/infrastructure/config/config.service.js';
import { performanceMiddleware } from './shared/infrastructure/observability/performance.interceptor.js';
import { isPerformanceInstrumentationEnabled } from './shared/infrastructure/observability/performance-context.js';
import { GlobalExceptionFilter } from './shared/infrastructure/http/global-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const isProduction = config.isProduction();

  if (isPerformanceInstrumentationEnabled()) {
    app.use(performanceMiddleware);
  }

  // Self-terminate after an idle period so Passenger frees its process slot on
  // shared hosting (CloudLinux NPROC limits). Passenger respawns on the next
  // request. Override/disable via APP_IDLE_TIMEOUT_MINUTES (0 = off).
  const idleMinutes = Number.parseInt(
    process.env.APP_IDLE_TIMEOUT_MINUTES ?? '15',
    10,
  );
  if (isProduction && idleMinutes > 0) {
    let inFlight = 0;
    let lastActivity = Date.now();
    app.use((req: any, res: any, next: () => void) => {
      inFlight += 1;
      lastActivity = Date.now();
      res.on('finish', () => {
        inFlight -= 1;
      });
      next();
    });
    setInterval(() => {
      if (inFlight === 0 && Date.now() - lastActivity > idleMinutes * 60_000) {
        process.exit(0);
      }
    }, 60_000).unref();
  }

  app.enableCors({
    // In production, only allow configured origins. In development, reflect the
    // request origin so the app works from any local/IP address (e.g. mobile).
    origin: isProduction
      ? config
          .get('ALLOWED_ORIGINS')
          .split(',')
          .map((o) => o.trim())
      : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.getHttpAdapter().get('/', (_req, res) => {
    res.send('Nestjs Backend app');
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  if (isProduction) {
    await app.listen(port);
  } else {
    await app.listen(port, '0.0.0.0');
  }
}
bootstrap();
