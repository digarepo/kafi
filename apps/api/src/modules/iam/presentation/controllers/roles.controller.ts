import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleRepository } from '../../application/ports/role.repository.js';
import { PermissionResolver } from '../../application/services/permission-resolver.service.js';
import { JwtAuthGuard } from '../../../../shared/application/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../../shared/application/guards/permissions.guard.js';
import { MustChangePasswordGuard } from '../guards/must-change-password.guard.js';
import { RequirePermissions } from '../../../../shared/application/decorators/require-permissions.decorator.js';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { Inject } from '@nestjs/common';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Admin role and permission lookup endpoints.
 */
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard, MustChangePasswordGuard)
export class RolesController {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly roles: RoleRepository,
    private readonly permissionResolver: PermissionResolver,
  ) {}

  /**
   * Lists all active roles.
   */
  @Get()
  @RequirePermissions('AUTH_MANAGE')
  list() {
    return this.roles.list();
  }

  /**
   * Lists all permissions grouped by module.
   */
  @Get('permissions')
  @RequirePermissions('AUTH_MANAGE')
  async permissions() {
    const rows = await this.db.query.permissions.findMany({
      orderBy: (permissions, { asc }) => asc(permissions.permission_code),
    });

    const grouped = rows.reduce<
      Record<string, { id: string; permission_code: string; name: string }[]>
    >((acc, row) => {
      const module = row.module ?? 'General';
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push({
        id: row.id,
        permission_code: row.permission_code,
        name: row.name,
      });
      return acc;
    }, {});

    return grouped;
  }
}
