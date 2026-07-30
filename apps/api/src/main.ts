import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    // In production, only allow known admin origins. In development, reflect the
    // request origin so the app works from any local/IP address (e.g. mobile).
    origin: isProduction
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://localhost:5174',
        ]
      : true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.getHttpAdapter().get('/', (_req, res) => {
    res.send('Nestjs Backend app');
  });

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 4000);
}
bootstrap();
