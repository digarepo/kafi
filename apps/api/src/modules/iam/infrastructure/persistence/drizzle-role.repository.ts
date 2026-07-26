import { Inject, Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { createTypedId, TypedId } from '../../../../shared/kernel/typed-id.js';
import { RoleRepository, RoleView } from '../../application/ports/role.repository.js';

/**
 * Drizzle ORM implementation of the role repository.
 */
@Injectable()
export class DrizzleRoleRepository extends RoleRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {
    super();
  }

  async findById(id: TypedId<'Role'>): Promise<RoleView | undefined> {
    const row = await this.db.query.roles.findFirst({
      where: (roles, { eq }) => eq(roles.id, id),
    });

    return row ? this.map(row) : undefined;
  }

  async findByIds(ids: TypedId<'Role'>[]): Promise<RoleView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.db.query.roles.findMany({
      where: (roles, { inArray }) => inArray(roles.id, ids),
    });

    return rows.map((row) => this.map(row));
  }

  async list(): Promise<RoleView[]> {
    const rows = await this.db.query.roles.findMany({
      orderBy: (roles, { asc }) => asc(roles.role_code),
      where: (roles, { eq }) => eq(roles.is_active, true),
    });

    return rows.map((row) => this.map(row));
  }

  private map(row: any): RoleView {
    return {
      id: createTypedId<'Role'>(row.id),
      role_code: row.role_code,
      name: row.name,
      is_system_role: row.is_system_role,
      is_active: row.is_active,
    };
  }
}
