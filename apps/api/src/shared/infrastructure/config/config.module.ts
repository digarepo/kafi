import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema.js';
import { ConfigService } from './config.service.js';

/**
 * Global configuration module. Loads `.env` from `apps/api` and validates
 * all environment variables against configSchema using Zod.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: (config: Record<string, unknown>) => configSchema.parse(config),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
