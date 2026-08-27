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
import { CreateRefundDto, RefundFiltersDto } from '../dto/refunds.dto.js';
import { PaymentsService } from './payments.service.js';

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Owns the `Refund` aggregate — returns money to a customer without
 * modifying the original payment record.
 *
 * @remarks
 * - **Authority:** MANAGER or ADMIN can approve (FINANCE_REFUND_APPROVE).
 * - A refund is always linked to the original payment and payer.
 * - The refund amount cannot exceed the payment's refundable (unallocated)
 *   balance at the time of approval.
 * - The original payment history is preserved.
 * - Refunds may also be used for cancellation financial adjustments.
 */
@Injectable()
export class RefundsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly paymentsService: PaymentsService,
  ) {}

  async listRefunds(dto: RefundFiltersDto) {
    const {
      page,
      page_size,
      payment_id,
      payer_id,
      refund_status_id,
      registration_id,
    } = dto;
    const filters = [eq(schema.refunds.is_deleted, false)];
    if (payment_id) filters.push(eq(schema.refunds.payment_id, payment_id));
    if (payer_id) filters.push(eq(schema.refunds.payer_id, payer_id));
    if (refund_status_id)
      filters.push(eq(schema.refunds.refund_status_id, refund_status_id));
    if (registration_id)
      filters.push(eq(schema.refunds.registration_id, registration_id));

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.refunds)
        .leftJoin(
          schema.refundStatuses,
          eq(schema.refunds.refund_status_id, schema.refundStatuses.id),
        )
        .leftJoin(
          schema.payments,
          eq(schema.refunds.payment_id, schema.payments.id),
        )
        .leftJoin(schema.payers, eq(schema.refunds.payer_id, schema.payers.id))
        .where(and(...filters))
        .orderBy(desc(schema.refunds.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.refunds)
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

  async getRefund(id: string) {
    const refund = await this.getRefundOrThrow(id);
    return this.mapRefundRow(refund);
  }

  async createRefund(dto: CreateRefundDto, actorId: string) {
    // Verify payment exists and is not deleted
    const payment = await this.getPaymentOrThrow(dto.payment_id);
    const payerId = payment.payer_id;

    // Reject refunds against CANCELLED payments. A cancelled payment has
    // already had its allocations reversed; refunding it would be
    // inconsistent with the payment lifecycle.
    const [paymentStatus] = await this.db
      .select({ status_code: schema.paymentStatuses.status_code })
      .from(schema.paymentStatuses)
      .where(eq(schema.paymentStatuses.id, payment.payment_status_id))
      .limit(1);
    if (paymentStatus?.status_code === 'CANCELLED') {
      throw new ConflictException(
        'Cannot create a refund against a cancelled payment',
      );
    }

    // Use a transaction with a row lock on the payment so that concurrent
    // refund requests cannot both read the same available balance and
    // over-refund. SELECT ... FOR UPDATE locks the payment row for the
    // duration of the transaction.
    const approvedStatus = await this.getRefundStatusByCode('APPROVED');
    const id = ulid();
    const number = await this.generateRefundNumber();
    const now = new Date();

    return this.db.transaction(async (tx) => {
      // Lock the payment row to prevent concurrent refund races
      const [lockedPayment] = await tx
        .select()
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.id, dto.payment_id),
            eq(schema.payments.is_deleted, false),
          ),
        )
        .for('update')
        .limit(1);

      if (!lockedPayment) throw new NotFoundException('Payment not found');

      // Re-check status under lock
      const [lockedStatus] = await tx
        .select({ status_code: schema.paymentStatuses.status_code })
        .from(schema.paymentStatuses)
        .where(eq(schema.paymentStatuses.id, lockedPayment.payment_status_id))
        .limit(1);
      if (lockedStatus?.status_code === 'CANCELLED') {
        throw new ConflictException(
          'Cannot create a refund against a cancelled payment',
        );
      }

      // Compute refundable (unallocated) balance under lock
      const [allocRow] = await tx
        .select({
          allocated: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
        })
        .from(schema.paymentAllocations)
        .where(
          and(
            eq(schema.paymentAllocations.payment_id, dto.payment_id),
            eq(schema.paymentAllocations.is_deleted, false),
          ),
        );
      const unallocated = toTwoDecimals(
        Number(lockedPayment.amount) - Number(allocRow?.allocated ?? 0),
      );

      // Check for existing pending/approved refunds against this payment
      const cancelledStatus = await this.getRefundStatusByCode('CANCELLED');
      const [refundRow] = await tx
        .select({
          total: sql<number>`coalesce(sum(${schema.refunds.amount}), 0)`,
        })
        .from(schema.refunds)
        .where(
          and(
            eq(schema.refunds.payment_id, dto.payment_id),
            eq(schema.refunds.is_deleted, false),
            sql`${schema.refunds.refund_status_id} != ${cancelledStatus.id}`,
          ),
        );
      const existingRefundsTotal = toTwoDecimals(Number(refundRow?.total ?? 0));

      const availableForRefund = toTwoDecimals(
        unallocated - existingRefundsTotal,
      );
      if (dto.amount > availableForRefund) {
        throw new ConflictException(
          `Refund amount (${dto.amount}) exceeds the refundable balance (${availableForRefund})`,
        );
      }

      await tx.insert(schema.refunds).values({
        id,
        refund_number: number,
        payment_id: dto.payment_id,
        payer_id: payerId,
        amount: String(dto.amount),
        reason: dto.reason,
        refund_date: dto.refund_date,
        approved_by: actorId,
        approved_at: now,
        refund_status_id: approvedStatus.id,
        registration_id: dto.registration_id ?? null,
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });

      return this.getRefund(id);
    });
  }

  async completeRefund(id: string, actorId: string) {
    const refund = await this.getRefundOrThrow(id);
    const completedStatus = await this.getRefundStatusByCode('COMPLETED');
    await this.db
      .update(schema.refunds)
      .set({
        refund_status_id: completedStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.refunds.id, id));
    return this.getRefund(id);
  }

  async cancelRefund(id: string, actorId: string) {
    const refund = await this.getRefundOrThrow(id);
    const cancelledStatus = await this.getRefundStatusByCode('CANCELLED');
    await this.db
      .update(schema.refunds)
      .set({
        refund_status_id: cancelledStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.refunds.id, id));
    return this.getRefund(id);
  }

  async archiveRefund(id: string, actorId: string) {
    await this.getRefundOrThrow(id);
    await this.db
      .update(schema.refunds)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.refunds.id, id));
  }

  /**
   * Returns the total refund amount for a payment (excluding cancelled/deleted).
   * Used for refundable balance calculations.
   */
  async getTotalRefundsForPayment(paymentId: string): Promise<number> {
    return this.getExistingRefundsTotal(paymentId);
  }

  // ---- Private helpers ----

  private async getRefundOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.refunds)
      .where(
        and(eq(schema.refunds.id, id), eq(schema.refunds.is_deleted, false)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Refund not found');
    return row;
  }

  private async getPaymentOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.payments)
      .where(
        and(eq(schema.payments.id, id), eq(schema.payments.is_deleted, false)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  private async getRefundStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.refundStatuses)
      .where(
        and(
          eq(schema.refundStatuses.status_code, code),
          eq(schema.refundStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Refund status ${code} not found`);
    return row;
  }

  private async getExistingRefundsTotal(paymentId: string): Promise<number> {
    const cancelledStatus = await this.getRefundStatusByCode('CANCELLED');
    const [row] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.refunds.amount}), 0)`,
      })
      .from(schema.refunds)
      .where(
        and(
          eq(schema.refunds.payment_id, paymentId),
          eq(schema.refunds.is_deleted, false),
          // Exclude cancelled refunds from the total
          sql`${schema.refunds.refund_status_id} != ${cancelledStatus.id}`,
        ),
      );
    return toTwoDecimals(Number(row?.total ?? 0));
  }

  private async generateRefundNumber() {
    const year = new Date().getFullYear();
    const pattern = `RFD-${year}-%`;
    const [row] = await this.db
      .select({ max: sql<string>`max(${schema.refunds.refund_number})` })
      .from(schema.refunds)
      .where(sql`${schema.refunds.refund_number} LIKE ${pattern}`);
    let next = 1;
    if (row?.max) {
      const parts = (row.max as string).split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `RFD-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapRefundRow(row: typeof schema.refunds.$inferSelect) {
    return {
      id: row.id,
      refund_number: row.refund_number,
      payment_id: row.payment_id,
      payer_id: row.payer_id,
      amount: row.amount,
      reason: row.reason,
      refund_date: row.refund_date,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      refund_status_id: row.refund_status_id,
      registration_id: row.registration_id,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapListRow(row: any) {
    return {
      id: row.refunds.id,
      refund_number: row.refunds.refund_number,
      payment_id: row.refunds.payment_id,
      payer_id: row.refunds.payer_id,
      amount: row.refunds.amount,
      reason: row.refunds.reason,
      refund_date: row.refunds.refund_date,
      approved_at: row.refunds.approved_at,
      registration_id: row.refunds.registration_id,
      status: row.refund_statuses
        ? {
            id: row.refund_statuses.id,
            code: row.refund_statuses.status_code,
            name: row.refund_statuses.name,
          }
        : null,
      payment: row.payments
        ? {
            id: row.payments.id,
            payment_number: row.payments.payment_number,
            amount: row.payments.amount,
          }
        : null,
      payer: row.payers
        ? {
            id: row.payers.id,
            payer_number: row.payers.payer_number,
            organization_name: row.payers.organization_name,
            contact_name: row.payers.contact_name,
          }
        : null,
      created_at: row.refunds.created_at,
      updated_at: row.refunds.updated_at,
    };
  }
}
