import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { count, eq } from 'drizzle-orm';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { createTypedId, TypedId } from '../../../../shared/kernel/typed-id.js';
import { UserRepository } from '../ports/user.repository.js';
import { RoleRepository } from '../ports/role.repository.js';
import { PasswordService } from './password.service.js';
import { DomainException } from '../../../../shared/application/exceptions/domain.exception.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';

/**
 * Response shape for a newly created user.
 */
export interface CreatedUserResult {
  id: string;
  temporary_password: string;
}

/**
 * Service responsible for staff user management.
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly password: PasswordService,
  ) {}

  /**
   * Lists staff users with pagination.
   *
   * @param page - Page number (1-based).
   * @param pageSize - Number of users per page.
   * @returns Paginated list of users.
   */
  async list(
    page = 1,
    pageSize = 25,
  ): Promise<{
    items: Awaited<ReturnType<UserRepository['list']>>;
    total: number;
  }> {
    const limit = Math.min(pageSize, 100);
    const offset = (Math.max(page, 1) - 1) * limit;

    const [items, count] = await Promise.all([
      this.users.list(limit, offset),
      this.countActive(),
    ]);

    return { items, total: count };
  }

  /**
   * Creates a new staff user with a temporary password.
   *
   * @param dto - Create user DTO.
   * @returns Created user id and temporary password.
   */
  async create(dto: CreateUserDto): Promise<CreatedUserResult> {
    const roleIds = dto.role_ids.map((id) => createTypedId<'Role'>(id));
    await this.validateRoles(roleIds);
    await this.ensureEmailAndPhoneUnique(dto.email, dto.phone);

    const activeStatus = await this.findActiveStatus();
    const temporaryPassword = this.password.generateTemporaryPassword();
    const passwordHash = await this.password.hash(temporaryPassword);

    const id = await this.users.create({
      employee_number: dto.employee_number,
      full_name: dto.full_name,
      gender: dto.gender,
      email_address: dto.email,
      phone_number: dto.phone,
      job_title: dto.job_title ?? null,
      password_hash: passwordHash,
      must_change_password: true,
      user_status_id: activeStatus,
      role_ids: roleIds,
    });

    return {
      id: id as string,
      temporary_password: temporaryPassword,
    };
  }

  /**
   * Updates a staff user.
   *
   * @param id - User id.
   * @param dto - Update user DTO.
   */
  async update(id: string, dto: UpdateUserDto): Promise<void> {
    const userId = createTypedId<'User'>(id);
    const existing = await this.users.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const roleIds = dto.role_ids?.map((rid) => createTypedId<'Role'>(rid));
    if (roleIds !== undefined) {
      await this.validateRoles(roleIds);
    }

    if (dto.email !== undefined && dto.email !== existing.email_address) {
      await this.ensureEmailUnique(dto.email);
    }

    if (dto.phone !== undefined && dto.phone !== existing.phone_number) {
      await this.ensurePhoneUnique(dto.phone);
    }

    await this.users.update(userId, {
      full_name: dto.full_name,
      gender: dto.gender,
      email_address: dto.email,
      phone_number: dto.phone,
      job_title: dto.job_title,
      user_status_id: dto.user_status_id
        ? createTypedId<'UserStatus'>(dto.user_status_id)
        : undefined,
      role_ids: roleIds,
    });
  }

  /**
   * Soft-deletes a staff user.
   *
   * @param id - User id.
   */
  async delete(id: string): Promise<void> {
    const userId = createTypedId<'User'>(id);
    const existing = await this.users.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    await this.users.delete(userId);
  }

  private async validateRoles(roleIds: TypedId<'Role'>[]): Promise<void> {
    if (roleIds.length === 0) {
      throw new DomainException('At least one role is required');
    }

    const roles = await this.roles.findByIds(roleIds);
    if (roles.length !== roleIds.length) {
      throw new DomainException('One or more roles are invalid');
    }
  }

  private async ensureEmailAndPhoneUnique(
    email: string,
    phone: string,
  ): Promise<void> {
    const existing = await this.db.query.users.findFirst({
      where: (users, { eq, or }) =>
        or(eq(users.email_address, email), eq(users.phone_number, phone)),
    });

    if (existing) {
      throw new ConflictException('Email or phone number already in use');
    }
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    const existing = await this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email_address, email),
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }
  }

  private async ensurePhoneUnique(phone: string): Promise<void> {
    const existing = await this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.phone_number, phone),
    });

    if (existing) {
      throw new ConflictException('Phone number already in use');
    }
  }

  private async findActiveStatus(): Promise<TypedId<'UserStatus'>> {
    const status = await this.db.query.userStatuses.findFirst({
      where: (statuses, { eq }) => eq(statuses.status_code, 'ACTIVE'),
    });

    if (!status) {
      throw new DomainException('ACTIVE user status not found');
    }

    return createTypedId<'UserStatus'>(status.id);
  }

  private async countActive(): Promise<number> {
    const activeStatus = await this.db.query.userStatuses.findFirst({
      where: (statuses, { eq }) => eq(statuses.status_code, 'ACTIVE'),
    });

    if (!activeStatus) {
      return 0;
    }

    const result = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.user_status_id, activeStatus.id));

    return result[0]?.count ?? 0;
  }
}
