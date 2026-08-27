import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '../dto/reference-data.dto.js';

/**
 * Provides all finance lookup lists (`invoice_statuses`, `payment_statuses`,
 * `payer_types`, `payer_statuses`, `payment_methods`,
 * `payment_method_statuses`, `invoice_line_item_types`).
 *
 * @remarks
 * - **Authority:** Read-only for most lookups; `payment_methods` is the only
 *   finance lookup with admin CRUD support.
 * - Also exposes `getStatusByCode()` helpers used internally by
 *   `InvoicesService`, `PaymentsService`, and `PayersService` to resolve a
 *   status/type row from its stable `*_code` (e.g. `DRAFT`, `COMPLETED`)
 *   without duplicating lookup logic in each service.
 */
@Injectable()
export class ReferenceDataService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  listInvoiceStatuses() {
    return this.db
      .select()
      .from(schema.invoiceStatuses)
      .where(eq(schema.invoiceStatuses.is_deleted, false));
  }

  listPaymentStatuses() {
    return this.db
      .select()
      .from(schema.paymentStatuses)
      .where(eq(schema.paymentStatuses.is_deleted, false));
  }

  listPayerTypes() {
    return this.db
      .select()
      .from(schema.payerTypes)
      .where(eq(schema.payerTypes.is_deleted, false));
  }

  listPayerStatuses() {
    return this.db
      .select()
      .from(schema.payerStatuses)
      .where(eq(schema.payerStatuses.is_deleted, false));
  }

  listInvoiceLineItemTypes() {
    return this.db
      .select()
      .from(schema.invoiceLineItemTypes)
      .where(eq(schema.invoiceLineItemTypes.is_deleted, false));
  }

  listExpenseStatuses() {
    return this.db
      .select()
      .from(schema.expenseStatuses)
      .where(eq(schema.expenseStatuses.is_deleted, false));
  }

  listExpenseCategories() {
    return this.db
      .select()
      .from(schema.expenseCategories)
      .where(eq(schema.expenseCategories.is_deleted, false));
  }

  listExpenseSources() {
    return this.db
      .select()
      .from(schema.expenseSources)
      .where(eq(schema.expenseSources.is_deleted, false));
  }

  listFinanceExceptionStatuses() {
    return this.db
      .select()
      .from(schema.financeExceptionStatuses)
      .where(eq(schema.financeExceptionStatuses.is_deleted, false));
  }

  listRefundStatuses() {
    return this.db
      .select()
      .from(schema.refundStatuses)
      .where(eq(schema.refundStatuses.is_deleted, false));
  }

  listCreditExceptionRequestStatuses() {
    return this.db
      .select()
      .from(schema.creditExceptionRequestStatuses)
      .where(eq(schema.creditExceptionRequestStatuses.is_deleted, false));
  }

  async listPaymentMethods() {
    const rows = await this.db
      .select()
      .from(schema.paymentMethods)
      .leftJoin(
        schema.paymentMethodStatuses,
        eq(
          schema.paymentMethods.payment_method_status_id,
          schema.paymentMethodStatuses.id,
        ),
      )
      .where(eq(schema.paymentMethods.is_deleted, false));

    return rows.map((row) => ({
      id: row.payment_methods.id,
      method_code: row.payment_methods.method_code,
      name: row.payment_methods.name,
      description: row.payment_methods.description,
      display_order: row.payment_methods.display_order,
      status: row.payment_method_statuses
        ? {
            id: row.payment_method_statuses.id,
            code: row.payment_method_statuses.status_code,
            name: row.payment_method_statuses.name,
          }
        : null,
    }));
  }

  async createPaymentMethod(dto: CreatePaymentMethodDto) {
    const activeStatus = await this.getPaymentMethodStatusByCode('ACTIVE');
    const id = ulid();
    await this.db.insert(schema.paymentMethods).values({
      id,
      method_code: dto.method_code,
      name: dto.name,
      description: dto.description ?? null,
      display_order: dto.display_order,
      payment_method_status_id: activeStatus.id,
    });
    return this.getPaymentMethod(id);
  }

  async updatePaymentMethod(id: string, dto: UpdatePaymentMethodDto) {
    await this.getPaymentMethod(id);
    await this.db
      .update(schema.paymentMethods)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.display_order !== undefined && {
          display_order: dto.display_order,
        }),
        ...(dto.payment_method_status_id !== undefined && {
          payment_method_status_id: dto.payment_method_status_id,
        }),
        updated_at: new Date(),
      })
      .where(eq(schema.paymentMethods.id, id));
    return this.getPaymentMethod(id);
  }

  async archivePaymentMethod(id: string) {
    await this.getPaymentMethod(id);
    await this.db
      .update(schema.paymentMethods)
      .set({ is_deleted: true, deleted_at: new Date(), updated_at: new Date() })
      .where(eq(schema.paymentMethods.id, id));
  }

  /**
   * Resolves an `invoice_statuses` row by its stable status code.
   *
   * @param code - Status code, e.g. `DRAFT`.
   * @throws NotFoundException - When no matching, non-deleted row exists.
   */
  async getInvoiceStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.invoiceStatuses)
      .where(
        and(
          eq(schema.invoiceStatuses.status_code, code),
          eq(schema.invoiceStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Invoice status ${code} not found`);
    return row;
  }

  /**
   * Resolves a `payment_statuses` row by its stable status code.
   *
   * @param code - Status code, e.g. `COMPLETED`.
   * @throws NotFoundException - When no matching, non-deleted row exists.
   */
  async getPaymentStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.paymentStatuses)
      .where(
        and(
          eq(schema.paymentStatuses.status_code, code),
          eq(schema.paymentStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Payment status ${code} not found`);
    return row;
  }

  /**
   * Resolves a `payer_statuses` row by its stable status code.
   *
   * @param code - Status code, e.g. `ACTIVE`.
   * @throws NotFoundException - When no matching, non-deleted row exists.
   */
  async getPayerStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.payerStatuses)
      .where(
        and(
          eq(schema.payerStatuses.status_code, code),
          eq(schema.payerStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Payer status ${code} not found`);
    return row;
  }

  /**
   * Resolves a `payer_types` row by its stable type code.
   *
   * @param id - The `payer_types.id` to resolve.
   * @throws NotFoundException - When no matching, non-deleted row exists.
   */
  async getPayerType(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.payerTypes)
      .where(
        and(
          eq(schema.payerTypes.id, id),
          eq(schema.payerTypes.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Payer type not found');
    return row;
  }

  /**
   * Resolves a `payment_method_statuses` row by its stable status code.
   *
   * @param code - Status code, e.g. `ACTIVE`.
   * @throws NotFoundException - When no matching, non-deleted row exists.
   */
  async getPaymentMethodStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.paymentMethodStatuses)
      .where(
        and(
          eq(schema.paymentMethodStatuses.status_code, code),
          eq(schema.paymentMethodStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row)
      throw new NotFoundException(`Payment method status ${code} not found`);
    return row;
  }

  private async getPaymentMethod(id: string) {
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
}
