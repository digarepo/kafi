import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { ConfigService } from './shared/infrastructure/config/config.service.js';
import { performanceMiddleware } from './shared/infrastructure/observability/performance.interceptor.js';
import { isPerformanceInstrumentationEnabled } from './shared/infrastructure/observability/performance-context.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = app.get(ConfigService);
  const isProduction = config.isProduction();

  if (isPerformanceInstrumentationEnabled()) {
    app.use(performanceMiddleware);
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
