import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configSchema } from './config.schema.js';
import { ConfigService } from './config.service.js';

/**
 * Global configuration module. Loads `.env` and validates all environment
 * variables against configSchema using Zod.
 *
 * In the Nx monorepo (dev), the `.env` file sits at the monorepo root
 * (two levels up from `apps/api`). In a standalone deployment (prod), it
 * may sit in the app directory or one level up (the user home).
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
      validate: (config: Record<string, unknown>) => configSchema.parse(config),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
