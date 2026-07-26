import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../shared/infrastructure/config/config.service.js';
import { SharedModule } from '../../shared/shared.module.js';
import { EventBusModule } from '../../shared/infrastructure/events/event-bus.module.js';

import { AuthService } from './application/services/auth.service.js';
import { UsersService } from './application/services/users.service.js';
import { PasswordService } from './application/services/password.service.js';
import { PermissionResolver } from './application/services/permission-resolver.service.js';

import { UserRepository } from './application/ports/user.repository.js';
import { RoleRepository } from './application/ports/role.repository.js';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository.js';
import { DrizzleRoleRepository } from './infrastructure/persistence/drizzle-role.repository.js';

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
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: RoleRepository, useClass: DrizzleRoleRepository },
  ],
  exports: [AuthService, UsersService, PermissionResolver, UserRepository, RoleRepository],
})
export class IAMModule {}
