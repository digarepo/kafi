import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, like, max, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  AllocatePaymentDto,
  CreatePaymentDto,
  PaymentFiltersDto,
  UpdatePaymentDto,
} from '../dto/payments.dto.js';
import { ReferenceDataService } from './reference-data.service.js';
import { createPaymentUnallocatedEvent } from '../../domain/events/payment-unallocated.event.js';

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Owns the `Payment` aggregate, including its `PaymentAllocation` children.
 *
 * @remarks
 * - **Authority:** `amount`, the ETB accounting value, is always computed
 *   here as `original_amount * exchange_rate`; it is never accepted from a
 *   request body. `original_amount`, `original_currency_id`, and
 *   `exchange_rate` are retained for audit/historical reference only and
 *   are never used in balance or allocation math.
 * - **Invariants:** allocations are always ETB; a payment cannot be
 *   over-allocated beyond its ETB `amount`; overpayment against an invoice
 *   is prevented by capping allocation at the invoice's outstanding balance.
 */
@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly referenceData: ReferenceDataService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listPayments(dto: PaymentFiltersDto) {
    const { page, page_size, search, payer_id, payment_status_id } = dto;
    const filters = [eq(schema.payments.is_deleted, false)];
    if (payer_id) filters.push(eq(schema.payments.payer_id, payer_id));
    if (payment_status_id)
      filters.push(eq(schema.payments.payment_status_id, payment_status_id));
    if (search) {
      filters.push(
        or(
          like(schema.payments.payment_number, `%${search}%`),
          like(schema.payments.reference_number, `%${search}%`),
        ) as any,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.payments)
        .leftJoin(
          schema.payers,
          eq(schema.payments.payer_id, schema.payers.id),
        )
        .leftJoin(
          schema.paymentMethods,
          eq(schema.payments.payment_method_id, schema.paymentMethods.id),
        )
        .leftJoin(
          schema.paymentStatuses,
          eq(schema.payments.payment_status_id, schema.paymentStatuses.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.payments.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.payments)
        .where(and(...filters))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: await Promise.all(rows.map((row) => this.mapListRow(row))),
      total: count,
      page,
      page_size,
    };
  }

  async getPayment(id: string) {
    const payment = await this.getPaymentOrThrow(id);
    const allocations = await this.listAllocations(id);
    const unallocated = await this.computeUnallocatedBalance(
      id,
      payment.amount,
    );
    return {
      ...this.mapPaymentRow(payment),
      allocations,
      unallocated_amount: unallocated,
    };
  }

  async createPayment(dto: CreatePaymentDto, actorId: string) {
    await this.getActivePayer(dto.payer_id);
    await this.getPaymentMethodOrThrow(dto.payment_method_id);
    const completedStatus = await this.referenceData.getPaymentStatusByCode(
      'COMPLETED',
    );

    const amount = toTwoDecimals(dto.original_amount * dto.exchange_rate);
    const id = ulid();
    const number = await this.generatePaymentNumber();

    await this.db.insert(schema.payments).values({
      id,
      payment_number: number,
      payer_id: dto.payer_id,
      payment_method_id: dto.payment_method_id,
      payment_date: dto.payment_date,
      original_amount: String(dto.original_amount),
      original_currency_id: dto.original_currency_id,
      exchange_rate: String(dto.exchange_rate),
      amount: String(amount),
      reference_number: dto.reference_number ?? null,
      received_by: actorId,
      payment_status_id: completedStatus.id,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    this.emitUnallocatedIfAny(id, dto.payer_id, amount);

    return this.getPayment(id);
  }

  async updatePayment(id: string, dto: UpdatePaymentDto, actorId: string) {
    await this.getPaymentOrThrow(id);
    await this.db
      .update(schema.payments)
      .set({
        ...(dto.payment_status_id !== undefined && {
          payment_status_id: dto.payment_status_id,
        }),
        ...(dto.reference_number !== undefined && {
          reference_number: dto.reference_number ?? null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.payments.id, id));
    return this.getPayment(id);
  }

  /**
   * Soft-deletes a payment.
   *
   * @throws ConflictException - When the payment has any active (non
   * -deleted) allocations; allocations must be reversed first.
   */
  async archivePayment(id: string, actorId: string) {
    await this.getPaymentOrThrow(id);
    const activeAllocations = await this.db
      .select({ id: schema.paymentAllocations.id })
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.payment_id, id),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      )
      .limit(1);
    if (activeAllocations.length > 0) {
      throw new ConflictException(
        'Cannot archive a payment with active allocations; reverse allocations first',
      );
    }
    await this.db
      .update(schema.payments)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.payments.id, id));
  }

  async listAllocations(paymentId: string) {
    const rows = await this.db
      .select()
      .from(schema.paymentAllocations)
      .innerJoin(
        schema.invoices,
        eq(schema.paymentAllocations.invoice_id, schema.invoices.id),
      )
      .where(
        and(
          eq(schema.paymentAllocations.payment_id, paymentId),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      )
      .orderBy(desc(schema.paymentAllocations.allocation_date));

    return rows.map((row) => ({
      id: row.payment_allocations.id,
      invoice_id: row.payment_allocations.invoice_id,
      invoice_number: row.invoices.invoice_number,
      allocated_amount: row.payment_allocations.allocated_amount,
      allocation_date: row.payment_allocations.allocation_date,
      notes: row.payment_allocations.notes,
    }));
  }

  /**
   * Allocates part or all of a payment's unallocated ETB balance to one or
   * more invoices.
   *
   * @throws NotFoundException - When the payment or an invoice does not exist.
   * @throws ConflictException - When the requested allocations exceed the
   * payment's unallocated balance, an invoice's outstanding balance, or a
   * `(payment_id, invoice_id)` allocation already exists.
   */
  async allocatePayment(
    id: string,
    dto: AllocatePaymentDto,
    actorId: string,
  ) {
    const payment = await this.getPaymentOrThrow(id);
    const unallocated = await this.computeUnallocatedBalance(
      id,
      payment.amount,
    );

    const requestedTotal = toTwoDecimals(
      dto.allocations.reduce((sum, a) => sum + a.allocated_amount, 0),
    );
    if (requestedTotal > unallocated) {
      throw new ConflictException(
        `Requested allocation total (${requestedTotal}) exceeds the payment's unallocated balance (${unallocated})`,
      );
    }

    for (const allocation of dto.allocations) {
      await this.assertNoExistingAllocation(id, allocation.invoice_id);
      const invoiceBalance = await this.getInvoiceBalance(
        allocation.invoice_id,
      );
      if (allocation.allocated_amount > invoiceBalance) {
        throw new ConflictException(
          `Allocated amount (${allocation.allocated_amount}) exceeds invoice outstanding balance (${invoiceBalance})`,
        );
      }

      await this.db.insert(schema.paymentAllocations).values({
        id: ulid(),
        payment_id: id,
        invoice_id: allocation.invoice_id,
        allocated_amount: String(allocation.allocated_amount),
        notes: allocation.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });
    }

    const remaining = toTwoDecimals(unallocated - requestedTotal);
    if (remaining > 0) {
      this.eventEmitter.emit(
        ...this.buildUnallocatedEvent(id, payment.payer_id, remaining),
      );
    }

    return this.getPayment(id);
  }

  // ---- Private helpers ----

  private async getActivePayer(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.payers)
      .where(and(eq(schema.payers.id, id), eq(schema.payers.is_deleted, false)))
      .limit(1);
    if (!row) throw new NotFoundException('Payer not found');
    return row;
  }

  private async getPaymentMethodOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.paymentMethods)
      .where(
        and(
          eq(schema.paymentMethods.id, id),
          eq(schema.paymentMethods.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Payment method not found');
    return row;
  }

  private async getPaymentOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.id, id), eq(schema.payments.is_deleted, false)))
      .limit(1);
    if (!row) throw new NotFoundException('Payment not found');
    return row;
  }

  private async getInvoiceBalance(invoiceId: string) {
    const [invoice] = await this.db
      .select({ total_amount: schema.invoices.total_amount })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.is_deleted, false),
        ),
      )
      .limit(1);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const [row] = await this.db
      .select({
        allocated: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
      })
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.invoice_id, invoiceId),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      );

    const allocated = Number(row?.allocated ?? 0);
    return toTwoDecimals(Number(invoice.total_amount) - allocated);
  }

  private async assertNoExistingAllocation(
    paymentId: string,
    invoiceId: string,
  ) {
    const [existing] = await this.db
      .select({ id: schema.paymentAllocations.id })
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.payment_id, paymentId),
          eq(schema.paymentAllocations.invoice_id, invoiceId),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      )
      .limit(1);
    if (existing) {
      throw new ConflictException(
        'This payment is already allocated to this invoice',
      );
    }
  }

  private async computeUnallocatedBalance(
    paymentId: string,
    amount: string | number,
  ) {
    const [row] = await this.db
      .select({
        allocated: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
      })
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.payment_id, paymentId),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      );
    const allocated = Number(row?.allocated ?? 0);
    return toTwoDecimals(Number(amount) - allocated);
  }

  private buildUnallocatedEvent(
    paymentId: string,
    payerId: string,
    unallocatedAmount: number,
  ): [string, ReturnType<typeof createPaymentUnallocatedEvent>] {
    const event = createPaymentUnallocatedEvent({
      payment_id: paymentId,
      payer_id: payerId,
      unallocated_amount: unallocatedAmount,
      created_at: new Date().toISOString(),
    });
    return [event.type, event];
  }

  private emitUnallocatedIfAny(
    paymentId: string,
    payerId: string,
    amount: number,
  ) {
    if (amount > 0) {
      this.eventEmitter.emit(
        ...this.buildUnallocatedEvent(paymentId, payerId, amount),
      );
    }
  }

  private async generatePaymentNumber() {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(schema.payments.payment_number) })
      .from(schema.payments)
      .where(like(schema.payments.payment_number, `PAY-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `PAY-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapPaymentRow(row: typeof schema.payments.$inferSelect) {
    return {
      id: row.id,
      payment_number: row.payment_number,
      payer_id: row.payer_id,
      payment_method_id: row.payment_method_id,
      payment_date: row.payment_date,
      original_amount: row.original_amount,
      original_currency_id: row.original_currency_id,
      exchange_rate: row.exchange_rate,
      amount: row.amount,
      reference_number: row.reference_number,
      received_by: row.received_by,
      payment_status_id: row.payment_status_id,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private async mapListRow(row: any) {
    const unallocated = await this.computeUnallocatedBalance(
      row.payments.id,
      row.payments.amount,
    );
    return {
      id: row.payments.id,
      payment_number: row.payments.payment_number,
      payment_date: row.payments.payment_date,
      amount: row.payments.amount,
      unallocated_amount: unallocated,
      payer: row.payers
        ? {
            id: row.payers.id,
            payer_number: row.payers.payer_number,
            organization_name: row.payers.organization_name,
            contact_name: row.payers.contact_name,
          }
        : null,
      payment_method: row.payment_methods
        ? { id: row.payment_methods.id, name: row.payment_methods.name }
        : null,
      status: row.payment_statuses
        ? {
            id: row.payment_statuses.id,
            code: row.payment_statuses.status_code,
            name: row.payment_statuses.name,
          }
        : null,
      created_at: row.payments.created_at,
      updated_at: row.payments.updated_at,
    };
  }
}
