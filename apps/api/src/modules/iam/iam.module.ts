import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../shared/infrastructure/config/config.service.js';
import { SharedModule } from '../../shared/shared.module.js';
import { EventBusModule } from '../../shared/infrastructure/events/event-bus.module.js';

import { AuthService } from './application/services/auth.service.js';
import { UsersService } from './application/services/users.service.js';
import { PasswordService } from './application/services/password.service.js';
import { PermissionResolver } from './application/services/permission-resolver.service.js';
import { AuditLogger } from './application/services/audit-logger.service.js';

import { UserRepository } from './application/ports/user.repository.js';
import { RoleRepository } from './application/ports/role.repository.js';
import { RefreshTokenRepository } from './application/ports/refresh-token.repository.js';
import { OneTimeTokenRepository } from './application/ports/one-time-token.repository.js';
import { Mailer } from './application/ports/mailer.port.js';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository.js';
import { DrizzleRoleRepository } from './infrastructure/persistence/drizzle-role.repository.js';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token.repository.js';
import { DrizzleOneTimeTokenRepository } from './infrastructure/persistence/drizzle-one-time-token.repository.js';
import { ConsoleMailer } from './infrastructure/email/console-mailer.service.js';
import { ResendMailer } from './infrastructure/email/resend-mailer.service.js';

import { AuthController } from './presentation/controllers/auth.controller.js';
import { UsersController } from './presentation/controllers/users.controller.js';
import { RolesController } from './presentation/controllers/roles.controller.js';

/**
 * Identity and access management module. Provides authentication, user
 * management, and role/permission resolution.
 */
@Module({
  imports: [
    SharedModule,
    EventBusModule,
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UsersController, RolesController],
  providers: [
    AuthService,
    UsersService,
    PasswordService,
    PermissionResolver,
    AuditLogger,
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: RoleRepository, useClass: DrizzleRoleRepository },
    {
      provide: RefreshTokenRepository,
      useClass: DrizzleRefreshTokenRepository,
    },
    {
      provide: OneTimeTokenRepository,
      useClass: DrizzleOneTimeTokenRepository,
    },
    {
      provide: Mailer,
      useFactory: () => {
        const driver =
          process.env['MAILER_DRIVER'] ??
          (process.env['NODE_ENV'] === 'production' ? 'resend' : 'console');
        if (driver === 'console') {
          return new ConsoleMailer();
        }

        const apiKey = process.env['RESEND_API_KEY'];
        const from = process.env['MAIL_FROM'] ?? 'noreply@kafitour.com';
        const appUrl =
          process.env['APP_URL'] ??
          (process.env['NODE_ENV'] === 'production'
            ? 'https://admin.kafitour.com'
            : 'http://localhost:3002');
        if (!apiKey) {
          throw new Error(
            'Missing RESEND_API_KEY. Set MAILER_DRIVER=console for local testing or provide RESEND_API_KEY.',
          );
        }

        return new ResendMailer({ apiKey, from, appUrl });
      },
    },
  ],
  exports: [
    AuthService,
    UsersService,
    PermissionResolver,
    AuditLogger,
    UserRepository,
    RoleRepository,
  ],
})
export class IAMModule {}
