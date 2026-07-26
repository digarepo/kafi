import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Resolves the effective permission codes for roles or users.
 */
@Injectable()
export class PermissionResolver {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns all distinct permission codes granted by the given role ids.
   *
   * @param roleIds - UUID role identifiers.
   * @returns Sorted permission codes.
   */
  async resolveForRoles(roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .selectDistinct({ permission_code: schema.permissions.permission_code })
      .from(schema.rolePermissions)
      .innerJoin(
        schema.permissions,
        eq(schema.rolePermissions.permission_id, schema.permissions.id),
      )
      .where(inArray(schema.rolePermissions.role_id, roleIds));

    return rows.map((r) => r.permission_code).sort();
  }

  /**
   * Resolves permission codes from a user's roles.
   *
   * @param roleIds - UUID role identifiers assigned to the user.
   * @returns Sorted permission codes.
   */
  async resolveForUser(roleIds: string[]): Promise<string[]> {
    return this.resolveForRoles(roleIds);
  }
}
