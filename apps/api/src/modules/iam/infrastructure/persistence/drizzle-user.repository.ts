import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { createTypedId, TypedId } from '../../../../shared/kernel/typed-id.js';
import {
  CreateUserInput,
  UpdateUserInput,
  UserRepository,
  UserWithRoles,
} from '../../application/ports/user.repository.js';

/**
 * Drizzle ORM implementation of the user repository.
 */
@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {
    super();
  }

  async findActiveByEmail(email: string): Promise<UserWithRoles | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .leftJoin(
        schema.userStatuses,
        eq(schema.users.user_status_id, schema.userStatuses.id),
      )
      .where(eq(schema.users.email_address, email))
      .limit(1);

    if (!row) {
      return undefined;
    }

    const roles = await this.db
      .select({
        id: schema.roles.id,
        role_code: schema.roles.role_code,
        name: schema.roles.name,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.role_id, schema.roles.id))
      .where(eq(schema.userRoles.user_id, row.users.id));

    return this.mapFrom(row.users, row.user_statuses, roles);
  }

  async findById(id: TypedId<'User'>): Promise<UserWithRoles | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .leftJoin(
        schema.userStatuses,
        eq(schema.users.user_status_id, schema.userStatuses.id),
      )
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!row) {
      return undefined;
    }

    const roles = await this.db
      .select({
        id: schema.roles.id,
        role_code: schema.roles.role_code,
        name: schema.roles.name,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.role_id, schema.roles.id))
      .where(eq(schema.userRoles.user_id, row.users.id));

    return this.mapFrom(row.users, row.user_statuses, roles);
  }

  async list(limit: number, offset: number): Promise<UserWithRoles[]> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .leftJoin(
        schema.userStatuses,
        eq(schema.users.user_status_id, schema.userStatuses.id),
      )
      .orderBy(desc(schema.users.created_at))
      .limit(limit)
      .offset(offset);

    if (rows.length === 0) {
      return [];
    }

    const userIds = rows.map((r) => r.users.id);
    const roleRows = await this.db
      .select({
        user_id: schema.userRoles.user_id,
        id: schema.roles.id,
        role_code: schema.roles.role_code,
        name: schema.roles.name,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.role_id, schema.roles.id))
      .where(inArray(schema.userRoles.user_id, userIds));

    const rolesByUser = new Map<
      string,
      { id: string; role_code: string; name: string }[]
    >();
    for (const roleRow of roleRows) {
      const list = rolesByUser.get(roleRow.user_id) ?? [];
      list.push({
        id: roleRow.id,
        role_code: roleRow.role_code,
        name: roleRow.name,
      });
      rolesByUser.set(roleRow.user_id, list);
    }

    return rows.map((row) =>
      this.mapFrom(
        row.users,
        row.user_statuses,
        rolesByUser.get(row.users.id) ?? [],
      ),
    );
  }

  async create(input: CreateUserInput): Promise<TypedId<'User'>> {
    const id = createTypedId<'User'>(ulid());

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        id,
        employee_number: input.employee_number,
        full_name: input.full_name,
        gender: input.gender,
        email_address: input.email_address,
        phone_number: input.phone_number,
        job_title: input.job_title ?? null,
        password_hash: input.password_hash,
        must_change_password: input.must_change_password,
        user_status_id: input.user_status_id,
      });

      if (input.role_ids.length > 0) {
        await tx.insert(schema.userRoles).values(
          input.role_ids.map((roleId) => ({
            id: ulid(),
            user_id: id,
            role_id: roleId,
            is_active: true,
          })),
        );
      }
    });

    return id;
  }

  async update(id: TypedId<'User'>, input: UpdateUserInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.users)
        .set({
          ...(input.full_name !== undefined && { full_name: input.full_name }),
          ...(input.gender !== undefined && { gender: input.gender }),
          ...(input.email_address !== undefined && {
            email_address: input.email_address,
          }),
          ...(input.phone_number !== undefined && {
            phone_number: input.phone_number,
          }),
          ...(input.job_title !== undefined && { job_title: input.job_title }),
          ...(input.user_status_id !== undefined && {
            user_status_id: input.user_status_id,
          }),
        })
        .where(eq(schema.users.id, id));

      if (input.role_ids !== undefined) {
        await tx
          .delete(schema.userRoles)
          .where(eq(schema.userRoles.user_id, id));
        if (input.role_ids.length > 0) {
          await tx.insert(schema.userRoles).values(
            input.role_ids.map((roleId) => ({
              id: ulid(),
              user_id: id,
              role_id: roleId,
              is_active: true,
            })),
          );
        }
      }
    });
  }

  async delete(id: TypedId<'User'>): Promise<void> {
    const deletedStatus = await this.db.query.userStatuses.findFirst({
      where: (statuses, { eq }) => eq(statuses.status_code, 'DELETED'),
    });

    if (!deletedStatus) {
      throw new Error('DELETED user status not found');
    }

    await this.db
      .update(schema.users)
      .set({ user_status_id: deletedStatus.id })
      .where(eq(schema.users.id, id));
  }

  async updatePassword(
    id: TypedId<'User'>,
    password_hash: string,
    must_change_password: boolean,
  ): Promise<void> {
    await this.db
      .update(schema.users)
      .set({
        password_hash,
        must_change_password,
        password_changed_at: must_change_password ? null : new Date(),
      })
      .where(eq(schema.users.id, id));
  }

  async updateLastLogin(id: TypedId<'User'>): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ last_login_at: new Date() })
      .where(eq(schema.users.id, id));
  }

  async verifyEmail(id: TypedId<'User'>): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ is_email_verified: true })
      .where(eq(schema.users.id, id));
  }

  private mapFrom(
    user: any,
    status: any,
    roles: { id: string; role_code: string; name: string }[],
  ): UserWithRoles {
    return {
      id: createTypedId<'User'>(user.id),
      employee_number: user.employee_number,
      full_name: user.full_name,
      gender: user.gender,
      email_address: user.email_address,
      phone_number: user.phone_number,
      job_title: user.job_title ?? null,
      password_hash: user.password_hash,
      must_change_password: user.must_change_password,
      is_email_verified: user.is_email_verified,
      user_status_id: createTypedId<'UserStatus'>(status.id),
      status_code: status.status_code,
      roles: roles.map((role) => ({
        id: createTypedId<'Role'>(role.id),
        role_code: role.role_code,
        name: role.name,
      })),
    };
  }
}
