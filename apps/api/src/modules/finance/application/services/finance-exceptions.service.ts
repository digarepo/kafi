import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreateFinanceExceptionDto,
  FinanceExceptionFiltersDto,
  UpdateFinanceExceptionDto,
} from '../dto/finance-exceptions.dto.js';

/**
 * Owns the `FinanceException` aggregate — authorized credit exceptions that
 * allow a registration to proceed despite an outstanding balance.
 *
 * @remarks
 * - **Authority:** Only ADMIN can approve (FINANCE_CREDIT_AUTHORIZE).
 * - An exception does NOT modify payment amounts, invoice totals, or
 *   outstanding balances. It only satisfies the workflow readiness gate.
 * - The system must still report the outstanding balance separately from
 *   the authorized credit.
 */
@Injectable()
export class FinanceExceptionsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async listExceptions(dto: FinanceExceptionFiltersDto) {
    const { page, page_size, registration_id, finance_exception_status_id } =
      dto;
    const filters = [eq(schema.financeExceptions.is_deleted, false)];
    if (registration_id)
      filters.push(
        eq(schema.financeExceptions.registration_id, registration_id),
      );
    if (finance_exception_status_id)
      filters.push(
        eq(
          schema.financeExceptions.finance_exception_status_id,
          finance_exception_status_id,
        ),
      );

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.financeExceptions)
        .leftJoin(
          schema.financeExceptionStatuses,
          eq(
            schema.financeExceptions.finance_exception_status_id,
            schema.financeExceptionStatuses.id,
          ),
        )
        .where(and(...filters))
        .orderBy(desc(schema.financeExceptions.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.financeExceptions)
        .where(and(...filters))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((row) => this.mapListRow(row)),
      total: count,
      page,
      page_size,
    };
  }

  async getException(id: string) {
    const exception = await this.getExceptionOrThrow(id);
    return this.mapExceptionRow(exception);
  }

  async createException(dto: CreateFinanceExceptionDto, actorId: string) {
    // Verify registration exists
    const [registration] = await this.db
      .select({ id: schema.registrations.id })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, dto.registration_id),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);
    if (!registration) throw new NotFoundException('Registration not found');

    const activeStatus = await this.getStatusByCode('ACTIVE');
    const id = ulid();
    const number = await this.generateExceptionNumber();
    const now = new Date();

    // The active_lock column + unique index on (registration_id, active_lock)
    // provides database-level concurrency protection. When two concurrent
    // requests both try to create an ACTIVE exception for the same
    // registration, both set active_lock = id (non-NULL), and the unique
    // index causes the second insert to fail with a duplicate key error.
    // We catch that and convert it to a ConflictException.
    try {
      await this.db.insert(schema.financeExceptions).values({
        id,
        exception_number: number,
        registration_id: dto.registration_id,
        authorized_amount: String(dto.authorized_amount),
        reason: dto.reason,
        approved_by: actorId,
        approved_at: now,
        due_date: dto.due_date ?? null,
        finance_exception_status_id: activeStatus.id,
        active_lock: id, // Set active_lock to the exception id when ACTIVE
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });
    } catch (err: any) {
      // MySQL duplicate entry error code 1062 — two concurrent ACTIVE
      // exceptions for the same registration
      if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
        throw new ConflictException(
          'An active finance exception already exists for this registration',
        );
      }
      throw err;
    }

    return this.getException(id);
  }

  async updateException(
    id: string,
    dto: UpdateFinanceExceptionDto,
    actorId: string,
  ) {
    await this.getExceptionOrThrow(id);
    await this.db
      .update(schema.financeExceptions)
      .set({
        ...(dto.authorized_amount !== undefined && {
          authorized_amount: String(dto.authorized_amount),
        }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.due_date !== undefined && {
          due_date: dto.due_date ?? null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.financeExceptions.id, id));
    return this.getException(id);
  }

  async revokeException(id: string, actorId: string) {
    const exception = await this.getExceptionOrThrow(id);
    const revokedStatus = await this.getStatusByCode('REVOKED');
    await this.db
      .update(schema.financeExceptions)
      .set({
        finance_exception_status_id: revokedStatus.id,
        active_lock: null, // Clear the lock when no longer ACTIVE
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.financeExceptions.id, id));
    return this.getException(id);
  }

  async archiveException(id: string, actorId: string) {
    await this.getExceptionOrThrow(id);
    await this.db
      .update(schema.financeExceptions)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.financeExceptions.id, id));
  }

  /**
   * Returns the active finance exception for a registration, if any.
   * Used by the readiness service to determine if credit is authorized.
   */
  async getActiveExceptionForRegistration(
    registrationId: string,
  ): Promise<{ authorized_amount: number } | null> {
    const activeStatus = await this.getStatusByCode('ACTIVE');
    const [row] = await this.db
      .select({
        id: schema.financeExceptions.id,
        authorized_amount: schema.financeExceptions.authorized_amount,
        due_date: schema.financeExceptions.due_date,
      })
      .from(schema.financeExceptions)
      .where(
        and(
          eq(schema.financeExceptions.registration_id, registrationId),
          eq(
            schema.financeExceptions.finance_exception_status_id,
            activeStatus.id,
          ),
          eq(schema.financeExceptions.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) return null;

    // Check if expired (due_date passed)
    if (row.due_date && new Date(row.due_date) < new Date()) {
      const expiredStatus = await this.getStatusByCode('EXPIRED');
      await this.db
        .update(schema.financeExceptions)
        .set({
          finance_exception_status_id: expiredStatus.id,
          active_lock: null, // Clear the lock when expired
          updated_at: new Date(),
        })
        .where(eq(schema.financeExceptions.id, row.id));
      return null;
    }

    return { authorized_amount: Number(row.authorized_amount) };
  }

  // ---- Private helpers ----

  private async getExceptionOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.financeExceptions)
      .where(
        and(
          eq(schema.financeExceptions.id, id),
          eq(schema.financeExceptions.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Finance exception not found');
    return row;
  }

  private async getStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.financeExceptionStatuses)
      .where(
        and(
          eq(schema.financeExceptionStatuses.status_code, code),
          eq(schema.financeExceptionStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row)
      throw new NotFoundException(`Finance exception status ${code} not found`);
    return row;
  }

  private async generateExceptionNumber() {
    const year = new Date().getFullYear();
    const pattern = `EXC-${year}-%`;
    const [row] = await this.db
      .select({
        max: sql<string>`max(${schema.financeExceptions.exception_number})`,
      })
      .from(schema.financeExceptions)
      .where(sql`${schema.financeExceptions.exception_number} LIKE ${pattern}`);
    let next = 1;
    if (row?.max) {
      const parts = (row.max as string).split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `EXC-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapExceptionRow(row: typeof schema.financeExceptions.$inferSelect) {
    return {
      id: row.id,
      exception_number: row.exception_number,
      registration_id: row.registration_id,
      authorized_amount: row.authorized_amount,
      reason: row.reason,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      due_date: row.due_date,
      finance_exception_status_id: row.finance_exception_status_id,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapListRow(row: any) {
    return {
      id: row.finance_exceptions.id,
      exception_number: row.finance_exceptions.exception_number,
      registration_id: row.finance_exceptions.registration_id,
      authorized_amount: row.finance_exceptions.authorized_amount,
      reason: row.finance_exceptions.reason,
      approved_by: row.finance_exceptions.approved_by,
      approved_at: row.finance_exceptions.approved_at,
      due_date: row.finance_exceptions.due_date,
      status: row.finance_exception_statuses
        ? {
            id: row.finance_exception_statuses.id,
            code: row.finance_exception_statuses.status_code,
            name: row.finance_exception_statuses.name,
          }
        : null,
      created_at: row.finance_exceptions.created_at,
      updated_at: row.finance_exceptions.updated_at,
    };
  }
}
