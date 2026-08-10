import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, inArray, like, max, not, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreateInvoiceDto,
  CreateLineItemDto,
  InvoiceFiltersDto,
  InvoiceLineItemInputDto,
  UpdateInvoiceDto,
  UpdateLineItemDto,
} from '../dto/invoices.dto.js';
import { ReferenceDataService } from './reference-data.service.js';

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function lineItemTotal(item: {
  quantity: number | string;
  unit_price: number | string;
}): number {
  return toTwoDecimals(Number(item.quantity) * Number(item.unit_price));
}

/**
 * Owns the `Invoice` aggregate, including its `InvoiceLineItem` children.
 *
 * @remarks
 * - **Authority:** `subtotal` and `total_amount` are always computed here
 *   from `invoice_line_items` and `discount_amount`; they are never
 *   accepted from a request body (the DTOs simply do not expose them).
 * - **Scope:** Slice 4 accounting is ETB-only. `currency_id` always
 *   resolves to the ETB currency row.
 * - **Registration cardinality:** no unique constraint exists on
 *   `registration_id`; multiple invoices per registration are supported
 *   by the schema, but the Slice 4 workflow creates exactly one.
 */
@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listInvoices(dto: InvoiceFiltersDto) {
    const { page, page_size, search, registration_id, invoice_status_id } = dto;
    const filters = [eq(schema.invoices.is_deleted, false)];
    if (registration_id)
      filters.push(eq(schema.invoices.registration_id, registration_id));
    if (invoice_status_id)
      filters.push(eq(schema.invoices.invoice_status_id, invoice_status_id));
    if (search) {
      filters.push(
        or(
          like(schema.invoices.invoice_number, `%${search}%`),
          like(schema.registrations.registration_number, `%${search}%`),
        ) as any,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.invoices)
        .innerJoin(
          schema.registrations,
          eq(schema.invoices.registration_id, schema.registrations.id),
        )
        .leftJoin(
          schema.invoiceStatuses,
          eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.invoices.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .innerJoin(
          schema.registrations,
          eq(schema.invoices.registration_id, schema.registrations.id),
        )
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

  async getInvoice(id: string) {
    const invoice = await this.getInvoiceOrThrow(id);
    const lineItems = await this.listLineItems(id);
    const balance = await this.computeOutstandingBalance(
      id,
      invoice.total_amount,
    );
    return {
      ...this.mapInvoiceRow(invoice),
      line_items: lineItems,
      outstanding_balance: balance,
    };
  }

  async getOutstandingBalance(id: string) {
    const invoice = await this.getInvoiceOrThrow(id);
    const balance = await this.computeOutstandingBalance(
      id,
      invoice.total_amount,
    );
    return { invoice_id: id, outstanding_balance: balance };
  }

  async createInvoice(dto: CreateInvoiceDto, actorId: string) {
    const registration = await this.getActiveRegistration(dto.registration_id);
    const currency = await this.getEtbCurrency();
    const draftStatus =
      await this.referenceData.getInvoiceStatusByCode('DRAFT');

    const subtotal = toTwoDecimals(
      dto.line_items.reduce((sum, item) => sum + lineItemTotal(item), 0),
    );
    const totalAmount = toTwoDecimals(subtotal - dto.discount_amount);

    const id = ulid();
    const number = await this.generateInvoiceNumber();

    await this.db.insert(schema.invoices).values({
      id,
      invoice_number: number,
      registration_id: registration.id,
      invoice_date: new Date(dto.invoice_date),
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      subtotal: String(subtotal),
      discount_amount: String(dto.discount_amount),
      total_amount: String(totalAmount),
      currency_id: currency.id,
      invoice_status_id: draftStatus.id,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    await this.insertLineItems(id, dto.line_items, actorId);

    return this.getInvoice(id);
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto, actorId: string) {
    const invoice = await this.getInvoiceOrThrow(id);

    const discountAmount =
      dto.discount_amount !== undefined
        ? dto.discount_amount
        : Number(invoice.subtotal) - Number(invoice.total_amount);
    const totalAmount = toTwoDecimals(
      Number(invoice.subtotal) - discountAmount,
    );

    await this.db
      .update(schema.invoices)
      .set({
        ...(dto.due_date !== undefined && {
          due_date: dto.due_date ? new Date(dto.due_date) : null,
        }),
        ...(dto.discount_amount !== undefined && {
          discount_amount: String(dto.discount_amount),
          total_amount: String(totalAmount),
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.invoices.id, id));

    return this.getInvoice(id);
  }

  async archiveInvoice(id: string, actorId: string) {
    await this.getInvoiceOrThrow(id);
    await this.db
      .update(schema.invoices)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.invoices.id, id));
  }

  async listLineItems(invoiceId: string) {
    const rows = await this.db
      .select()
      .from(schema.invoiceLineItems)
      .leftJoin(
        schema.invoiceLineItemTypes,
        eq(
          schema.invoiceLineItems.line_item_type_id,
          schema.invoiceLineItemTypes.id,
        ),
      )
      .where(
        and(
          eq(schema.invoiceLineItems.invoice_id, invoiceId),
          eq(schema.invoiceLineItems.is_deleted, false),
        ),
      )
      .orderBy(desc(schema.invoiceLineItems.created_at));

    return rows.map((row) => ({
      id: row.invoice_line_items.id,
      description: row.invoice_line_items.description,
      quantity: row.invoice_line_items.quantity,
      unit_price: row.invoice_line_items.unit_price,
      total_price: row.invoice_line_items.total_price,
      notes: row.invoice_line_items.notes,
      line_item_type: row.invoice_line_item_types
        ? {
            id: row.invoice_line_item_types.id,
            code: row.invoice_line_item_types.line_item_type_code,
            name: row.invoice_line_item_types.name,
          }
        : null,
    }));
  }

  async addLineItem(
    invoiceId: string,
    dto: CreateLineItemDto,
    actorId: string,
  ) {
    await this.getInvoiceOrThrow(invoiceId);
    await this.insertLineItems(invoiceId, [dto], actorId);
    await this.recalculateInvoiceTotals(invoiceId, actorId);
    return this.getInvoice(invoiceId);
  }

  async updateLineItem(
    invoiceId: string,
    lineItemId: string,
    dto: UpdateLineItemDto,
    actorId: string,
  ) {
    const lineItem = await this.getLineItemOrThrow(invoiceId, lineItemId);
    const quantity = dto.quantity ?? Number(lineItem.quantity);
    const unitPrice = dto.unit_price ?? Number(lineItem.unit_price);
    const totalPrice = lineItemTotal({
      quantity,
      unit_price: unitPrice,
    });

    await this.db
      .update(schema.invoiceLineItems)
      .set({
        ...(dto.line_item_type_id !== undefined && {
          line_item_type_id: dto.line_item_type_id ?? null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.quantity !== undefined && { quantity: String(quantity) }),
        ...(dto.unit_price !== undefined && {
          unit_price: String(unitPrice),
        }),
        total_price: String(totalPrice),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.invoiceLineItems.id, lineItemId));

    await this.recalculateInvoiceTotals(invoiceId, actorId);
    return this.getInvoice(invoiceId);
  }

  async archiveLineItem(
    invoiceId: string,
    lineItemId: string,
    actorId: string,
  ) {
    await this.getLineItemOrThrow(invoiceId, lineItemId);
    await this.db
      .update(schema.invoiceLineItems)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.invoiceLineItems.id, lineItemId));

    await this.recalculateInvoiceTotals(invoiceId, actorId);
    return this.getInvoice(invoiceId);
  }

  /**
   * Composes a registration-scoped finance overview from invoices and
   * payment allocations.
   *
   * @param registrationId - The registration to summarize.
   * @returns Total invoiced, total paid, total unallocated, and outstanding
   * balance, all in ETB.
   *
   * @remarks
   * - `total_unallocated` covers only payments that have at least one
   *   allocation against an invoice of this registration; it reports each
   *   such payment's full unallocated balance (which may include amounts
   *   set aside for other registrations' invoices in a future allocation).
   */
  async getRegistrationFinanceSummary(registrationId: string) {
    const invoiceRows = await this.db
      .select({
        id: schema.invoices.id,
        total_amount: schema.invoices.total_amount,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.invoiceStatuses,
        eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
      )
      .where(
        and(
          eq(schema.invoices.registration_id, registrationId),
          eq(schema.invoices.is_deleted, false),
          not(eq(schema.invoiceStatuses.status_code, 'CANCELLED')),
        ),
      );

    const totalInvoiced = toTwoDecimals(
      invoiceRows.reduce((sum, row) => sum + Number(row.total_amount), 0),
    );

    const invoiceIds = invoiceRows.map((row) => row.id);
    if (invoiceIds.length === 0) {
      return {
        registration_id: registrationId,
        total_invoiced: 0,
        total_paid: 0,
        total_unallocated: 0,
        outstanding_balance: 0,
      };
    }

    const allocationRows = await this.db
      .select({
        payment_id: schema.paymentAllocations.payment_id,
        allocated_amount: schema.paymentAllocations.allocated_amount,
      })
      .from(schema.paymentAllocations)
      .where(
        and(
          inArray(schema.paymentAllocations.invoice_id, invoiceIds),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      );

    const totalPaid = toTwoDecimals(
      allocationRows.reduce(
        (sum, row) => sum + Number(row.allocated_amount),
        0,
      ),
    );

    const paymentIds = [
      ...new Set(allocationRows.map((row) => row.payment_id)),
    ];
    let totalUnallocated = 0;
    if (paymentIds.length > 0) {
      const paymentRows = await this.db
        .select({ id: schema.payments.id, amount: schema.payments.amount })
        .from(schema.payments)
        .where(
          and(
            inArray(schema.payments.id, paymentIds),
            eq(schema.payments.is_deleted, false),
          ),
        );
      const allAllocationRows = await this.db
        .select({
          payment_id: schema.paymentAllocations.payment_id,
          allocated_amount: schema.paymentAllocations.allocated_amount,
        })
        .from(schema.paymentAllocations)
        .where(
          and(
            inArray(schema.paymentAllocations.payment_id, paymentIds),
            eq(schema.paymentAllocations.is_deleted, false),
          ),
        );

      totalUnallocated = toTwoDecimals(
        paymentRows.reduce((sum, payment) => {
          const allocated = allAllocationRows
            .filter((row) => row.payment_id === payment.id)
            .reduce((s, row) => s + Number(row.allocated_amount), 0);
          return sum + Math.max(Number(payment.amount) - allocated, 0);
        }, 0),
      );
    }

    return {
      registration_id: registrationId,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      total_unallocated: totalUnallocated,
      outstanding_balance: toTwoDecimals(totalInvoiced - totalPaid),
    };
  }

  async getOutstandingBalanceForRegistration(registrationId: string) {
    const summary = await this.getRegistrationFinanceSummary(registrationId);
    return summary.outstanding_balance;
  }

  /**
   * Batch version of `getRegistrationFinanceSummary`.
   *
   * @returns A map of registration_id to the finance summary for the
   * requested registrations. Registrations with no invoices still appear
   * with zeroed totals.
   */
  async getRegistrationFinanceSummaries(registrationIds: string[]) {
    if (registrationIds.length === 0) {
      return new Map<
        string,
        {
          total_invoiced: number;
          total_paid: number;
          total_unallocated: number;
          outstanding_balance: number;
        }
      >();
    }

    const invoiceRows = await this.db
      .select({
        id: schema.invoices.id,
        registration_id: schema.invoices.registration_id,
        total_amount: schema.invoices.total_amount,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.invoiceStatuses,
        eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
      )
      .where(
        and(
          inArray(schema.invoices.registration_id, registrationIds),
          eq(schema.invoices.is_deleted, false),
          not(eq(schema.invoiceStatuses.status_code, 'CANCELLED')),
        ),
      );

    const result = new Map<
      string,
      {
        total_invoiced: number;
        total_paid: number;
        total_unallocated: number;
        outstanding_balance: number;
      }
    >();

    for (const id of registrationIds) {
      result.set(id, {
        total_invoiced: 0,
        total_paid: 0,
        total_unallocated: 0,
        outstanding_balance: 0,
      });
    }

    if (invoiceRows.length === 0) {
      return result;
    }

    const invoiceIds = invoiceRows.map((row) => row.id);

    const allocationRows = await this.db
      .select({
        payment_id: schema.paymentAllocations.payment_id,
        invoice_id: schema.paymentAllocations.invoice_id,
        allocated_amount: schema.paymentAllocations.allocated_amount,
      })
      .from(schema.paymentAllocations)
      .where(
        and(
          inArray(schema.paymentAllocations.invoice_id, invoiceIds),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      );

    const paymentIds = [
      ...new Set(allocationRows.map((row) => row.payment_id)),
    ];

    let unallocatedByPayment = new Map<string, number>();
    if (paymentIds.length > 0) {
      const paymentRows = await this.db
        .select({ id: schema.payments.id, amount: schema.payments.amount })
        .from(schema.payments)
        .where(
          and(
            inArray(schema.payments.id, paymentIds),
            eq(schema.payments.is_deleted, false),
          ),
        );

      const allAllocationRows = await this.db
        .select({
          payment_id: schema.paymentAllocations.payment_id,
          allocated_amount: schema.paymentAllocations.allocated_amount,
        })
        .from(schema.paymentAllocations)
        .where(
          and(
            inArray(schema.paymentAllocations.payment_id, paymentIds),
            eq(schema.paymentAllocations.is_deleted, false),
          ),
        );

      const paymentAmountById = new Map(
        paymentRows.map((p) => [p.id, Number(p.amount)]),
      );

      const allocatedByPayment = allAllocationRows.reduce((map, row) => {
        const current = map.get(row.payment_id) ?? 0;
        map.set(row.payment_id, current + Number(row.allocated_amount));
        return map;
      }, new Map<string, number>());

      unallocatedByPayment = new Map(
        paymentIds.map((id) => [
          id,
          Math.max(
            (paymentAmountById.get(id) ?? 0) -
              (allocatedByPayment.get(id) ?? 0),
            0,
          ),
        ]),
      );
    }

    const invoiceById = new Map(invoiceRows.map((inv) => [inv.id, inv]));
    const totalInvoicedByReg = new Map<string, number>();
    const totalPaidByReg = new Map<string, number>();
    const paymentIdsByReg = new Map<string, Set<string>>();

    for (const invoice of invoiceRows) {
      const current = totalInvoicedByReg.get(invoice.registration_id) ?? 0;
      totalInvoicedByReg.set(
        invoice.registration_id,
        toTwoDecimals(current + Number(invoice.total_amount)),
      );
    }

    for (const alloc of allocationRows) {
      const invoice = invoiceById.get(alloc.invoice_id);
      if (!invoice) continue;

      const currentPaid = totalPaidByReg.get(invoice.registration_id) ?? 0;
      totalPaidByReg.set(
        invoice.registration_id,
        toTwoDecimals(currentPaid + Number(alloc.allocated_amount)),
      );

      const paymentSet =
        paymentIdsByReg.get(invoice.registration_id) ?? new Set<string>();
      paymentSet.add(alloc.payment_id);
      paymentIdsByReg.set(invoice.registration_id, paymentSet);
    }

    for (const id of registrationIds) {
      const totalInvoiced = totalInvoicedByReg.get(id) ?? 0;
      const totalPaid = totalPaidByReg.get(id) ?? 0;
      const paymentSet = paymentIdsByReg.get(id) ?? new Set<string>();
      let totalUnallocated = 0;
      for (const paymentId of paymentSet) {
        totalUnallocated += unallocatedByPayment.get(paymentId) ?? 0;
      }

      result.set(id, {
        total_invoiced: toTwoDecimals(totalInvoiced),
        total_paid: toTwoDecimals(totalPaid),
        total_unallocated: toTwoDecimals(totalUnallocated),
        outstanding_balance: toTwoDecimals(totalInvoiced - totalPaid),
      });
    }

    return result;
  }

  // ---- Private helpers ----

  private async getActiveRegistration(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, id),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Registration not found');
    return row;
  }

  private async getEtbCurrency() {
    const [row] = await this.db
      .select()
      .from(schema.currencies)
      .where(
        and(
          eq(schema.currencies.currency_code, 'ETB'),
          eq(schema.currencies.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('ETB currency not seeded');
    return row;
  }

  private async getInvoiceOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.invoices)
      .where(
        and(eq(schema.invoices.id, id), eq(schema.invoices.is_deleted, false)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Invoice not found');
    return row;
  }

  private async getLineItemOrThrow(invoiceId: string, lineItemId: string) {
    const [row] = await this.db
      .select()
      .from(schema.invoiceLineItems)
      .where(
        and(
          eq(schema.invoiceLineItems.id, lineItemId),
          eq(schema.invoiceLineItems.invoice_id, invoiceId),
          eq(schema.invoiceLineItems.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Invoice line item not found');
    return row;
  }

  private async insertLineItems(
    invoiceId: string,
    items: InvoiceLineItemInputDto[],
    actorId: string,
  ) {
    await this.db.insert(schema.invoiceLineItems).values(
      items.map((item) => ({
        id: ulid(),
        invoice_id: invoiceId,
        line_item_type_id: item.line_item_type_id ?? null,
        description: item.description,
        quantity: String(item.quantity),
        unit_price: String(item.unit_price),
        total_price: String(lineItemTotal(item)),
        notes: item.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      })),
    );
  }

  /**
   * Recomputes and persists `subtotal` and `total_amount` from the
   * invoice's current, non-deleted line items and `discount_amount`.
   *
   * @param invoiceId - The invoice to recalculate.
   * @param actorId - The user performing the mutation that triggered this.
   */
  private async recalculateInvoiceTotals(invoiceId: string, actorId: string) {
    const invoice = await this.getInvoiceOrThrow(invoiceId);
    const lineItems = await this.db
      .select({ total_price: schema.invoiceLineItems.total_price })
      .from(schema.invoiceLineItems)
      .where(
        and(
          eq(schema.invoiceLineItems.invoice_id, invoiceId),
          eq(schema.invoiceLineItems.is_deleted, false),
        ),
      );

    const subtotal = toTwoDecimals(
      lineItems.reduce((sum, row) => sum + Number(row.total_price), 0),
    );
    const totalAmount = toTwoDecimals(
      subtotal - Number(invoice.discount_amount),
    );

    await this.db
      .update(schema.invoices)
      .set({
        subtotal: String(subtotal),
        total_amount: String(totalAmount),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.invoices.id, invoiceId));
  }

  private async computeOutstandingBalance(
    invoiceId: string,
    totalAmount: string | number,
  ) {
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
    return toTwoDecimals(Number(totalAmount) - allocated);
  }

  private async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(schema.invoices.invoice_number) })
      .from(schema.invoices)
      .where(like(schema.invoices.invoice_number, `INV-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `INV-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapInvoiceRow(row: typeof schema.invoices.$inferSelect) {
    return {
      id: row.id,
      invoice_number: row.invoice_number,
      registration_id: row.registration_id,
      invoice_date: row.invoice_date,
      due_date: row.due_date,
      subtotal: row.subtotal,
      discount_amount: row.discount_amount,
      total_amount: row.total_amount,
      currency_id: row.currency_id,
      invoice_status_id: row.invoice_status_id,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapListRow(row: any) {
    return {
      id: row.invoices.id,
      invoice_number: row.invoices.invoice_number,
      invoice_date: row.invoices.invoice_date,
      due_date: row.invoices.due_date,
      total_amount: row.invoices.total_amount,
      status: row.invoice_statuses
        ? {
            id: row.invoice_statuses.id,
            code: row.invoice_statuses.status_code,
            name: row.invoice_statuses.name,
          }
        : null,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      created_at: row.invoices.created_at,
      updated_at: row.invoices.updated_at,
    };
  }
}
