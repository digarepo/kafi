import {
  ConflictException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { FinanceExceptionsService } from './finance-exceptions.service.js';
import { InvoicesService } from './invoices.service.js';
import {
  CreateCreditExceptionRequestDto,
  CreditExceptionRequestFiltersDto,
  RejectCreditExceptionRequestDto,
} from '../dto/credit-exception-requests.dto.js';

/**
 * Owns the `CreditExceptionRequest` aggregate — requests from agents or
 * managers to authorize a credit exception for a registration with an
 * outstanding balance.
 *
 * @remarks
 * - **Request authority:** any user with FINANCE_CREDIT_REQUEST can create
 *   a request. This includes AGENT and MANAGER.
 * - **Approval authority:** only ADMIN (FINANCE_CREDIT_AUTHORIZE) can approve
 *   or reject a request.
 * - A request is NOT a finance exception. Approval creates an ACTIVE
 *   finance exception via `FinanceExceptionsService.createException`.
 * - At most one PENDING request per registration is allowed, enforced by
 *   `active_request_lock` + a unique index.
 */
@Injectable()
export class CreditExceptionRequestsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly exceptions: FinanceExceptionsService,
    private readonly invoices: InvoicesService,
  ) {}

  async listRequests(dto: CreditExceptionRequestFiltersDto) {
    const {
      page,
      page_size,
      registration_id,
      credit_exception_request_status_id,
    } = dto;
    const filters = [eq(schema.creditExceptionRequests.is_deleted, false)];
    if (registration_id)
      filters.push(
        eq(schema.creditExceptionRequests.registration_id, registration_id),
      );
    if (credit_exception_request_status_id)
      filters.push(
        eq(
          schema.creditExceptionRequests.credit_exception_request_status_id,
          credit_exception_request_status_id,
        ),
      );

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.creditExceptionRequests)
        .leftJoin(
          schema.creditExceptionRequestStatuses,
          eq(
            schema.creditExceptionRequests.credit_exception_request_status_id,
            schema.creditExceptionRequestStatuses.id,
          ),
        )
        .leftJoin(
          schema.registrations,
          eq(
            schema.creditExceptionRequests.registration_id,
            schema.registrations.id,
          ),
        )
        .leftJoin(
          schema.travellers,
          eq(schema.registrations.traveller_id, schema.travellers.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.creditExceptionRequests.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.creditExceptionRequests)
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

  async getRequest(id: string) {
    const request = await this.getRequestOrThrow(id);
    return this.mapRequestRow(request);
  }

  /**
   * Returns the pending request for a registration, if any.
   * Used by the frontend to show request status on the registration detail.
   */
  async getPendingRequestForRegistration(
    registrationId: string,
  ): Promise<{ id: string; request_number: string } | null> {
    const pendingStatus = await this.getStatusByCode('PENDING');
    const [row] = await this.db
      .select({
        id: schema.creditExceptionRequests.id,
        request_number: schema.creditExceptionRequests.request_number,
      })
      .from(schema.creditExceptionRequests)
      .where(
        and(
          eq(schema.creditExceptionRequests.registration_id, registrationId),
          eq(
            schema.creditExceptionRequests.credit_exception_request_status_id,
            pendingStatus.id,
          ),
          eq(schema.creditExceptionRequests.is_deleted, false),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async createRequest(dto: CreateCreditExceptionRequestDto, actorId: string) {
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

    // Verify outstanding balance > 0
    const balance = await this.invoices.getOutstandingBalanceForRegistration(
      dto.registration_id,
    );
    if (balance <= 0) {
      throw new BadRequestException(
        'Cannot request a credit exception for a registration with no outstanding balance',
      );
    }

    // Verify requested amount does not exceed outstanding balance
    if (dto.requested_amount > balance) {
      throw new BadRequestException(
        `Requested amount (${dto.requested_amount}) exceeds outstanding balance (${balance})`,
      );
    }

    // Verify no ACTIVE finance exception already exists
    const activeException =
      await this.exceptions.getActiveExceptionForRegistration(
        dto.registration_id,
      );
    if (activeException) {
      throw new ConflictException(
        'An active finance exception already exists for this registration',
      );
    }

    const pendingStatus = await this.getStatusByCode('PENDING');
    const id = ulid();
    const number = await this.generateRequestNumber();
    const now = new Date();

    try {
      await this.db.insert(schema.creditExceptionRequests).values({
        id,
        request_number: number,
        registration_id: dto.registration_id,
        requested_amount: String(dto.requested_amount),
        reason: dto.reason,
        requested_due_date: dto.requested_due_date ?? null,
        requested_by: actorId,
        credit_exception_request_status_id: pendingStatus.id,
        active_request_lock: id,
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
        throw new ConflictException(
          'A pending credit exception request already exists for this registration',
        );
      }
      throw err;
    }

    return this.getRequest(id);
  }

  /**
   * Approves a pending request. Creates an ACTIVE finance exception via
   * the existing FinanceExceptionsService, then marks the request as
   * APPROVED with a link to the created exception.
   */
  async approveRequest(id: string, actorId: string) {
    const request = await this.getRequestOrThrow(id);

    // Verify the request is still PENDING
    const pendingStatus = await this.getStatusByCode('PENDING');
    if (request.credit_exception_request_status_id !== pendingStatus.id) {
      throw new ConflictException(
        'This credit exception request is no longer pending',
      );
    }

    // Create the ACTIVE finance exception using the existing service.
    // This enforces the active_lock uniqueness constraint and all
    // existing business rules.
    const exception = await this.exceptions.createException(
      {
        registration_id: request.registration_id,
        authorized_amount: Number(request.requested_amount),
        reason: request.reason,
        due_date: request.requested_due_date ?? undefined,
        notes: request.notes ?? undefined,
      },
      actorId,
    );

    // Mark the request as APPROVED
    const approvedStatus = await this.getStatusByCode('APPROVED');
    await this.db
      .update(schema.creditExceptionRequests)
      .set({
        credit_exception_request_status_id: approvedStatus.id,
        active_request_lock: null,
        reviewed_by: actorId,
        reviewed_at: new Date(),
        finance_exception_id: exception.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.creditExceptionRequests.id, id));

    return this.getRequest(id);
  }

  /**
   * Rejects a pending request. The registration remains payment-blocked.
   */
  async rejectRequest(
    id: string,
    dto: RejectCreditExceptionRequestDto,
    actorId: string,
  ) {
    const request = await this.getRequestOrThrow(id);

    const pendingStatus = await this.getStatusByCode('PENDING');
    if (request.credit_exception_request_status_id !== pendingStatus.id) {
      throw new ConflictException(
        'This credit exception request is no longer pending',
      );
    }

    const rejectedStatus = await this.getStatusByCode('REJECTED');
    await this.db
      .update(schema.creditExceptionRequests)
      .set({
        credit_exception_request_status_id: rejectedStatus.id,
        active_request_lock: null,
        reviewed_by: actorId,
        reviewed_at: new Date(),
        rejection_reason: dto.rejection_reason,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.creditExceptionRequests.id, id));

    return this.getRequest(id);
  }

  async archiveRequest(id: string, actorId: string) {
    await this.getRequestOrThrow(id);
    await this.db
      .update(schema.creditExceptionRequests)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.creditExceptionRequests.id, id));
  }

  // ---- Private helpers ----

  private async getRequestOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.creditExceptionRequests)
      .where(
        and(
          eq(schema.creditExceptionRequests.id, id),
          eq(schema.creditExceptionRequests.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Credit exception request not found');
    return row;
  }

  private async getStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.creditExceptionRequestStatuses)
      .where(
        and(
          eq(schema.creditExceptionRequestStatuses.status_code, code),
          eq(schema.creditExceptionRequestStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row)
      throw new NotFoundException(
        `Credit exception request status ${code} not found`,
      );
    return row;
  }

  private async generateRequestNumber() {
    const year = new Date().getFullYear();
    const pattern = `CER-${year}-%`;
    const [row] = await this.db
      .select({
        max: sql<string>`max(${schema.creditExceptionRequests.request_number})`,
      })
      .from(schema.creditExceptionRequests)
      .where(
        sql`${schema.creditExceptionRequests.request_number} LIKE ${pattern}`,
      );
    let next = 1;
    if (row?.max) {
      const parts = (row.max as string).split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `CER-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapRequestRow(
    row: typeof schema.creditExceptionRequests.$inferSelect,
  ) {
    return {
      id: row.id,
      request_number: row.request_number,
      registration_id: row.registration_id,
      requested_amount: row.requested_amount,
      reason: row.reason,
      requested_due_date: row.requested_due_date,
      requested_by: row.requested_by,
      credit_exception_request_status_id:
        row.credit_exception_request_status_id,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at,
      rejection_reason: row.rejection_reason,
      finance_exception_id: row.finance_exception_id,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapListRow(row: any) {
    return {
      id: row.credit_exception_requests.id,
      request_number: row.credit_exception_requests.request_number,
      registration_id: row.credit_exception_requests.registration_id,
      requested_amount: row.credit_exception_requests.requested_amount,
      reason: row.credit_exception_requests.reason,
      requested_due_date: row.credit_exception_requests.requested_due_date,
      requested_by: row.credit_exception_requests.requested_by,
      reviewed_by: row.credit_exception_requests.reviewed_by,
      reviewed_at: row.credit_exception_requests.reviewed_at,
      rejection_reason: row.credit_exception_requests.rejection_reason,
      finance_exception_id: row.credit_exception_requests.finance_exception_id,
      notes: row.credit_exception_requests.notes,
      status: row.credit_exception_request_statuses
        ? {
            id: row.credit_exception_request_statuses.id,
            code: row.credit_exception_request_statuses.status_code,
            name: row.credit_exception_request_statuses.name,
          }
        : null,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
          }
        : null,
      created_at: row.credit_exception_requests.created_at,
      updated_at: row.credit_exception_requests.updated_at,
    };
  }
}
