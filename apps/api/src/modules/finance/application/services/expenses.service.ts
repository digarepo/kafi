import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreateExpenseDto,
  ExpenseFiltersDto,
  UpdateExpenseDto,
} from '../dto/expenses.dto.js';
import { ReferenceDataService } from './reference-data.service.js';

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Owns the `Expense` aggregate, including its `ExpenseAllocation` children.
 *
 * @remarks
 * - **Authority:** `amount` is always ETB. When `original_amount` and
 *   `exchange_rate` are provided, `amount` is computed server-side;
 *   otherwise `amount` is accepted directly as ETB.
 * - Expenses may originate from operational workflows (visa, flight, hotel,
 *   transport) or be entered directly in Finance.
 * - Group expenses are allocated to travelers via `expense_allocations` for
 *   per-traveler profitability reporting.
 */
@Injectable()
export class ExpensesService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listExpenses(dto: ExpenseFiltersDto) {
    const {
      page,
      page_size,
      search,
      expense_category_id,
      expense_source_id,
      expense_status_id,
      traveller_id,
      registration_id,
      travel_group_id,
      package_version_id,
      date_from,
      date_to,
    } = dto;
    const filters = [eq(schema.expenses.is_deleted, false)];
    if (expense_category_id)
      filters.push(
        eq(schema.expenses.expense_category_id, expense_category_id),
      );
    if (expense_source_id)
      filters.push(eq(schema.expenses.expense_source_id, expense_source_id));
    if (expense_status_id)
      filters.push(eq(schema.expenses.expense_status_id, expense_status_id));
    if (traveller_id)
      filters.push(eq(schema.expenses.traveller_id, traveller_id));
    if (registration_id)
      filters.push(eq(schema.expenses.registration_id, registration_id));
    if (travel_group_id)
      filters.push(eq(schema.expenses.travel_group_id, travel_group_id));
    if (package_version_id)
      filters.push(eq(schema.expenses.package_version_id, package_version_id));
    if (date_from) filters.push(gte(schema.expenses.expense_date, date_from));
    if (date_to) filters.push(lte(schema.expenses.expense_date, date_to));
    if (search) {
      filters.push(
        or(
          like(schema.expenses.expense_number, `%${search}%`),
          like(schema.expenses.description, `%${search}%`),
          like(schema.expenses.payee_name, `%${search}%`),
        ) as any,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.expenses)
        .leftJoin(
          schema.expenseCategories,
          eq(schema.expenses.expense_category_id, schema.expenseCategories.id),
        )
        .leftJoin(
          schema.expenseSources,
          eq(schema.expenses.expense_source_id, schema.expenseSources.id),
        )
        .leftJoin(
          schema.expenseStatuses,
          eq(schema.expenses.expense_status_id, schema.expenseStatuses.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.expenses.expense_date))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.expenses)
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

  async getExpense(id: string, tx?: any) {
    const expense = await this.getExpenseOrThrow(id, tx);
    const allocations = await this.listExpenseAllocations(id);
    return {
      ...this.mapExpenseRow(expense),
      allocations,
    };
  }

  async createExpense(dto: CreateExpenseDto, actorId: string) {
    const confirmedStatus = await this.getExpenseStatusByCode('CONFIRMED');

    // Compute ETB amount
    let amount = dto.amount;
    if (dto.original_amount && dto.exchange_rate) {
      amount = toTwoDecimals(dto.original_amount * dto.exchange_rate);
    }

    const id = ulid();
    const number = await this.generateExpenseNumber();

    await this.db.insert(schema.expenses).values({
      id,
      expense_number: number,
      expense_category_id: dto.expense_category_id,
      expense_source_id: dto.expense_source_id,
      expense_status_id: confirmedStatus.id,
      amount: String(amount),
      original_amount: dto.original_amount ? String(dto.original_amount) : null,
      original_currency_id: dto.original_currency_id ?? null,
      exchange_rate: dto.exchange_rate ? String(dto.exchange_rate) : null,
      expense_date: dto.expense_date,
      description: dto.description ?? null,
      notes: dto.notes ?? null,
      vendor_id: dto.vendor_id ?? null,
      payee_name: dto.payee_name ?? null,
      attribution_scope: dto.attribution_scope,
      traveller_id: dto.traveller_id ?? null,
      registration_id: dto.registration_id ?? null,
      travel_group_id: dto.travel_group_id ?? null,
      package_version_id: dto.package_version_id ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getExpense(id);
  }

  async updateExpense(id: string, dto: UpdateExpenseDto, actorId: string) {
    await this.getExpenseOrThrow(id);
    await this.db
      .update(schema.expenses)
      .set({
        ...(dto.expense_category_id !== undefined && {
          expense_category_id: dto.expense_category_id,
        }),
        ...(dto.amount !== undefined && { amount: String(dto.amount) }),
        ...(dto.expense_date !== undefined && {
          expense_date: dto.expense_date,
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        ...(dto.vendor_id !== undefined && {
          vendor_id: dto.vendor_id ?? null,
        }),
        ...(dto.payee_name !== undefined && {
          payee_name: dto.payee_name ?? null,
        }),
        ...(dto.traveller_id !== undefined && {
          traveller_id: dto.traveller_id ?? null,
        }),
        ...(dto.registration_id !== undefined && {
          registration_id: dto.registration_id ?? null,
        }),
        ...(dto.travel_group_id !== undefined && {
          travel_group_id: dto.travel_group_id ?? null,
        }),
        ...(dto.package_version_id !== undefined && {
          package_version_id: dto.package_version_id ?? null,
        }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.expenses.id, id));
    return this.getExpense(id);
  }

  async archiveExpense(id: string, actorId: string) {
    await this.getExpenseOrThrow(id);
    await this.db
      .update(schema.expenses)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.expenses.id, id));
  }

  async listExpenseAllocations(expenseId: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseAllocations)
      .where(
        and(
          eq(schema.expenseAllocations.expense_id, expenseId),
          eq(schema.expenseAllocations.is_deleted, false),
        ),
      )
      .orderBy(desc(schema.expenseAllocations.created_at));
    return rows.map((row) => ({
      id: row.id,
      traveller_id: row.traveller_id,
      registration_id: row.registration_id,
      allocated_amount: row.allocated_amount,
      notes: row.notes,
    }));
  }

  /**
   * Allocates a group expense equally among the given travelers.
   *
   * For MVP, equal allocation is used. This is a reporting construct — it
   * does not create individual supplier transactions.
   */
  async allocateGroupExpense(
    expenseId: string,
    travellerIds: string[],
    actorId: string,
  ) {
    const expense = await this.getExpenseOrThrow(expenseId);
    if (expense.attribution_scope !== 'GROUP') {
      throw new ConflictException(
        'Only group-scoped expenses can be allocated to travelers',
      );
    }
    if (travellerIds.length === 0) {
      throw new ConflictException('At least one traveller is required');
    }

    const totalAmount = Number(expense.amount);
    const perTraveler = toTwoDecimals(totalAmount / travellerIds.length);

    await this.db.transaction(async (tx) => {
      // Soft-delete existing allocations
      await tx
        .update(schema.expenseAllocations)
        .set({
          is_deleted: true,
          deleted_at: new Date(),
          updated_at: new Date(),
          updated_by: actorId,
        })
        .where(eq(schema.expenseAllocations.expense_id, expenseId));

      // Insert new allocations
      await tx.insert(schema.expenseAllocations).values(
        travellerIds.map((tid) => ({
          id: ulid(),
          expense_id: expenseId,
          traveller_id: tid,
          registration_id: null,
          allocated_amount: String(perTraveler),
          created_by: actorId,
          updated_by: actorId,
        })),
      );
    });

    return this.getExpense(expenseId);
  }

  /**
   * Internal method used by operational workflows to create an expense from
   * an operational record. The source operational record linkage is set
   * automatically.
   *
   * @param params - The expense creation parameters.
   * @param tx - Optional transaction handle. When provided, all writes and
   *   deduplication reads use the transaction context so that the operational
   *   mutation and the Finance side effect are atomic.
   */
  async createExpenseFromOperational(
    params: {
      expense_category_code: string;
      expense_source_code: string;
      amount: number;
      expense_date: Date;
      description?: string;
      notes?: string;
      vendor_id?: string;
      attribution_scope: 'TRAVELER' | 'GROUP' | 'GENERAL';
      traveller_id?: string;
      registration_id?: string;
      travel_group_id?: string;
      package_version_id?: string;
      source_visa_application_id?: string;
      source_flight_booking_id?: string;
      source_group_hotel_stay_id?: string;
      source_transport_segment_id?: string;
      actorId: string;
    },
    tx?: any,
  ) {
    const dbh = tx ?? this.db;

    // Deduplication: ensure at most one Finance expense exists per
    // operational source record. This guards against duplicate HTTP
    // requests, retries, and service re-entry.
    const existing = await this.findExpenseBySource(params, dbh);
    if (existing) {
      return this.getExpense(existing.id, tx);
    }

    const category = await this.getExpenseCategoryByCode(
      params.expense_category_code,
    );
    const source = await this.getExpenseSourceByCode(
      params.expense_source_code,
    );
    const confirmedStatus = await this.getExpenseStatusByCode('CONFIRMED');

    const id = ulid();
    const number = await this.generateExpenseNumber(tx);

    await dbh.insert(schema.expenses).values({
      id,
      expense_number: number,
      expense_category_id: category.id,
      expense_source_id: source.id,
      expense_status_id: confirmedStatus.id,
      amount: String(params.amount),
      expense_date: params.expense_date,
      description: params.description ?? null,
      notes: params.notes ?? null,
      vendor_id: params.vendor_id ?? null,
      attribution_scope: params.attribution_scope,
      traveller_id: params.traveller_id ?? null,
      registration_id: params.registration_id ?? null,
      travel_group_id: params.travel_group_id ?? null,
      package_version_id: params.package_version_id ?? null,
      source_visa_application_id: params.source_visa_application_id ?? null,
      source_flight_booking_id: params.source_flight_booking_id ?? null,
      source_group_hotel_stay_id: params.source_group_hotel_stay_id ?? null,
      source_transport_segment_id: params.source_transport_segment_id ?? null,
      created_by: params.actorId,
      updated_by: params.actorId,
    });

    return this.getExpense(id, tx);
  }

  // ---- Private helpers ----

  private async getExpenseOrThrow(id: string, tx?: any) {
    const dbh = tx ?? this.db;
    const [row] = await dbh
      .select()
      .from(schema.expenses)
      .where(
        and(eq(schema.expenses.id, id), eq(schema.expenses.is_deleted, false)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Expense not found');
    return row;
  }

  /**
   * Finds an existing non-deleted expense linked to the same operational
   * source record. Used for deduplication so that retries or duplicate
   * requests do not create multiple Finance expenses for the same
   * operational event.
   */
  private async findExpenseBySource(
    params: {
      source_visa_application_id?: string;
      source_flight_booking_id?: string;
      source_group_hotel_stay_id?: string;
      source_transport_segment_id?: string;
    },
    dbh: any = this.db,
  ) {
    const conditions = [eq(schema.expenses.is_deleted, false)];

    if (params.source_visa_application_id) {
      conditions.push(
        eq(
          schema.expenses.source_visa_application_id,
          params.source_visa_application_id,
        ),
      );
    } else if (params.source_flight_booking_id) {
      conditions.push(
        eq(
          schema.expenses.source_flight_booking_id,
          params.source_flight_booking_id,
        ),
      );
    } else if (params.source_group_hotel_stay_id) {
      conditions.push(
        eq(
          schema.expenses.source_group_hotel_stay_id,
          params.source_group_hotel_stay_id,
        ),
      );
    } else if (params.source_transport_segment_id) {
      conditions.push(
        eq(
          schema.expenses.source_transport_segment_id,
          params.source_transport_segment_id,
        ),
      );
    } else {
      return null;
    }

    const [row] = await dbh
      .select({ id: schema.expenses.id })
      .from(schema.expenses)
      .where(and(...conditions))
      .limit(1);

    return row ?? null;
  }

  private async getExpenseStatusByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.expenseStatuses)
      .where(
        and(
          eq(schema.expenseStatuses.status_code, code),
          eq(schema.expenseStatuses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Expense status ${code} not found`);
    return row;
  }

  private async getExpenseCategoryByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.expenseCategories)
      .where(
        and(
          eq(schema.expenseCategories.category_code, code),
          eq(schema.expenseCategories.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Expense category ${code} not found`);
    return row;
  }

  private async getExpenseSourceByCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.expenseSources)
      .where(
        and(
          eq(schema.expenseSources.source_code, code),
          eq(schema.expenseSources.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`Expense source ${code} not found`);
    return row;
  }

  private async generateExpenseNumber(tx?: any) {
    const dbh = tx ?? this.db;
    const year = new Date().getFullYear();
    const [row] = await dbh
      .select({ max: sql<string>`max(${schema.expenses.expense_number})` })
      .from(schema.expenses)
      .where(like(schema.expenses.expense_number, `EXP-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = (row.max as string).split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `EXP-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapExpenseRow(row: typeof schema.expenses.$inferSelect) {
    return {
      id: row.id,
      expense_number: row.expense_number,
      expense_category_id: row.expense_category_id,
      expense_source_id: row.expense_source_id,
      expense_status_id: row.expense_status_id,
      amount: row.amount,
      original_amount: row.original_amount,
      original_currency_id: row.original_currency_id,
      exchange_rate: row.exchange_rate,
      expense_date: row.expense_date,
      description: row.description,
      notes: row.notes,
      vendor_id: row.vendor_id,
      payee_name: row.payee_name,
      attribution_scope: row.attribution_scope,
      traveller_id: row.traveller_id,
      registration_id: row.registration_id,
      travel_group_id: row.travel_group_id,
      package_version_id: row.package_version_id,
      source_visa_application_id: row.source_visa_application_id,
      source_flight_booking_id: row.source_flight_booking_id,
      source_group_hotel_stay_id: row.source_group_hotel_stay_id,
      source_transport_segment_id: row.source_transport_segment_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapListRow(row: any) {
    return {
      id: row.expenses.id,
      expense_number: row.expenses.expense_number,
      amount: row.expenses.amount,
      expense_date: row.expenses.expense_date,
      description: row.expenses.description,
      payee_name: row.expenses.payee_name,
      attribution_scope: row.expenses.attribution_scope,
      category: row.expense_categories
        ? {
            id: row.expense_categories.id,
            code: row.expense_categories.category_code,
            name: row.expense_categories.name,
          }
        : null,
      source: row.expense_sources
        ? {
            id: row.expense_sources.id,
            code: row.expense_sources.source_code,
            name: row.expense_sources.name,
          }
        : null,
      status: row.expense_statuses
        ? {
            id: row.expense_statuses.id,
            code: row.expense_statuses.status_code,
            name: row.expense_statuses.name,
          }
        : null,
      traveller_id: row.expenses.traveller_id,
      registration_id: row.expenses.registration_id,
      travel_group_id: row.expenses.travel_group_id,
      package_version_id: row.expenses.package_version_id,
      created_at: row.expenses.created_at,
      updated_at: row.expenses.updated_at,
    };
  }
}
