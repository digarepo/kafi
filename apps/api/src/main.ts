import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.getHttpAdapter().get('/', (req, res) => {
    res.send('Nestjs Backend app');
  });

  await app.listen(process.env.PORT ? parseInt(process.env.PORT, 10) : 4000);
}
bootstrap();
