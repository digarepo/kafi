import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from './infrastructure/config/config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { EventBusModule } from './infrastructure/events/event-bus.module.js';
import { JwtStrategy } from './application/strategies/jwt.strategy.js';
import { JwtAuthGuard } from './application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './application/guards/permissions.guard.js';
import { ZodValidationPipe } from './infrastructure/validation/zod-validation.pipe.js';
import { GlobalExceptionFilter } from './infrastructure/filters/global-exception.filter.js';

/**
 * Shared module that is imported once at the root of the API.
 *
 * It wires global infrastructure (config, database, events, passport) and
 * makes common guards and the Zod validation pipe available everywhere.
 */
@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, EventBusModule, PassportModule],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    ConfigModule,
    DatabaseModule,
    EventBusModule,
    PassportModule,
    JwtAuthGuard,
    PermissionsGuard,
  ],
})
export class SharedModule {}
