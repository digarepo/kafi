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
import {
  UserRepository,
  type UserWithRoles,
} from '../ports/user.repository.js';
import { RoleRepository } from '../ports/role.repository.js';
import { PasswordService } from './password.service.js';
import { AuditLogger } from './audit-logger.service.js';
import { DomainException } from '../../../../shared/application/exceptions/domain.exception.js';
import { AuthService } from './auth.service.js';
import { Mailer } from '../ports/mailer.port.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';

/**
 * Response shape for a newly created user.
 */
export interface CreatedUserResult {
  id: string;
  emailErrors: string[];
}

/**
 * Public read-model view of a staff user. Excludes sensitive fields such as
 * the password hash.
 */
export interface UserView {
  id: TypedId<'User'>;
  employee_number: string;
  full_name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  gender: string;
  email_address: string;
  phone_number: string;
  job_title: string | null;
  must_change_password: boolean;
  is_email_verified: boolean;
  user_status_id: TypedId<'UserStatus'>;
  status_code: string;
  roles: { id: TypedId<'Role'>; role_code: string; name: string }[];
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
    private readonly audit: AuditLogger,
    private readonly auth: AuthService,
    private readonly mailer: Mailer,
    private readonly numbers: BusinessNumberService,
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
    items: UserView[];
    total: number;
  }> {
    const limit = Math.min(pageSize, 100);
    const offset = (Math.max(page, 1) - 1) * limit;

    const [items, count] = await Promise.all([
      this.users.list(limit, offset),
      this.countActive(),
    ]);

    return { items: items.map((user) => this.toUserView(user)), total: count };
  }

  /**
   * Finds a single staff user by id.
   *
   * @param id - User id.
   * @returns User view or throws if not found.
   */
  async getById(id: string): Promise<UserView> {
    const user = await this.users.findById(createTypedId<'User'>(id));
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserView(user);
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
    const employeeNumber =
      dto.employee_number?.trim() ||
      (await this.numbers.generateEmployeeNumber());

    const fullName =
      dto.full_name?.trim() ||
      [dto.first_name, dto.middle_name, dto.last_name]
        .filter(Boolean)
        .join(' ');

    const id = await this.users.create({
      employee_number: employeeNumber,
      full_name: fullName,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      last_name: dto.last_name ?? null,
      gender: dto.gender,
      email_address: dto.email,
      phone_number: dto.phone,
      job_title: dto.job_title ?? null,
      password_hash: passwordHash,
      must_change_password: true,
      user_status_id: activeStatus,
      role_ids: roleIds,
    });

    await this.audit.log({
      userId: id as string,
      event: 'USER_CREATED',
      details: `employee_number: ${employeeNumber}`,
    });

    const emailErrors: string[] = [];

    try {
      await this.mailer.sendWelcomeEmail(dto.email, temporaryPassword);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to send welcome email:', message);
      emailErrors.push(message);
      await this.audit.log({
        userId: id as string,
        event: 'WELCOME_EMAIL_FAILED',
        details: message,
      });
    }

    try {
      await this.auth.sendEmailVerification(id as string);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to send verification email:', message);
      emailErrors.push(message);
      await this.audit.log({
        userId: id as string,
        event: 'VERIFICATION_EMAIL_FAILED',
        details: message,
      });
    }

    return {
      id: id as string,
      emailErrors,
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

    // Compute full_name from first_name + middle_name + last_name if any changed.
    const firstName = dto.first_name ?? existing.first_name;
    const middleName =
      dto.middle_name !== undefined ? dto.middle_name : existing.middle_name;
    const lastName =
      dto.last_name !== undefined ? dto.last_name : existing.last_name;
    const fullName =
      dto.full_name ??
      [firstName, middleName, lastName].filter(Boolean).join(' ');

    await this.users.update(userId, {
      full_name: fullName,
      first_name: dto.first_name,
      middle_name: dto.middle_name,
      last_name: dto.last_name,
      gender: dto.gender,
      email_address: dto.email,
      phone_number: dto.phone,
      job_title: dto.job_title,
      user_status_id: dto.user_status_id
        ? createTypedId<'UserStatus'>(dto.user_status_id)
        : undefined,
      role_ids: roleIds,
    });

    await this.audit.log({
      userId: id,
      event: 'USER_UPDATED',
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

    await this.audit.log({
      userId: id,
      event: 'USER_DELETED',
    });
  }

  private toUserView(user: UserWithRoles): UserView {
    const { password_hash: _ignored, ...view } = user;
    return view;
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
