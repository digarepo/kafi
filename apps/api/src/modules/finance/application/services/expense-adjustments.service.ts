import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, like, max, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreateExpenseAdjustmentDto,
  ExpenseAdjustmentFiltersDto,
} from '../dto/expense-adjustments.dto.js';

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Owns the `ExpenseAdjustment` aggregate — explicit financial adjustments
 * to operational expenses (supplier refunds, cancellation fees, other).
 *
 * @remarks
 * - **Authority:** The original expense is NEVER modified or deleted.
 *   Adjustments are recorded separately so that:
 *     Net cost = original expense + sum(adjustments)
 * - `amount` is ETB. Positive = additional cost. Negative = recovery.
 * - Duplicate prevention: at most one adjustment of each type per expense,
 *   enforced by a database unique constraint.
 * - Source record references are preserved even when the originating
 *   operational record is hard-deleted.
 */
@Injectable()
export class ExpenseAdjustmentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async listAdjustments(dto: ExpenseAdjustmentFiltersDto) {
    const {
      page,
      page_size,
      expense_id,
      adjustment_type,
      source_record_id,
      source_record_type,
      traveller_id,
      registration_id,
      travel_group_id,
    } = dto;
    const filters = [eq(schema.expenseAdjustments.is_deleted, false)];
    if (expense_id)
      filters.push(eq(schema.expenseAdjustments.expense_id, expense_id));
    if (adjustment_type)
      filters.push(
        eq(schema.expenseAdjustments.adjustment_type, adjustment_type),
      );
    if (source_record_id)
      filters.push(
        eq(schema.expenseAdjustments.source_record_id, source_record_id),
      );
    if (source_record_type)
      filters.push(
        eq(schema.expenseAdjustments.source_record_type, source_record_type),
      );
    if (traveller_id)
      filters.push(eq(schema.expenseAdjustments.traveller_id, traveller_id));
    if (registration_id)
      filters.push(
        eq(schema.expenseAdjustments.registration_id, registration_id),
      );
    if (travel_group_id)
      filters.push(
        eq(schema.expenseAdjustments.travel_group_id, travel_group_id),
      );

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.expenseAdjustments)
        .leftJoin(
          schema.expenses,
          eq(schema.expenseAdjustments.expense_id, schema.expenses.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.expenseAdjustments.adjustment_date))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.expenseAdjustments)
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

  async getAdjustment(id: string) {
    const adjustment = await this.getAdjustmentOrThrow(id);
    return this.mapAdjustmentRow(adjustment);
  }

  async createAdjustment(dto: CreateExpenseAdjustmentDto, actorId: string) {
    // Verify expense exists
    const [expense] = await this.db
      .select()
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.id, dto.expense_id),
          eq(schema.expenses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!expense) throw new NotFoundException('Expense not found');

    const id = ulid();

    // Retry insert on duplicate adjustment_number (race condition) with
    // a fresh number. A duplicate (expense_id, adjustment_type) is a real
    // business conflict and is not retried.
    const MAX_NUMBER_RETRIES = 5;
    let lastNumber: string | undefined;
    for (let attempt = 0; attempt < MAX_NUMBER_RETRIES; attempt++) {
      const number = await this.generateAdjustmentNumber();
      lastNumber = number;

      try {
        await this.db.insert(schema.expenseAdjustments).values({
          id,
          adjustment_number: number,
          expense_id: dto.expense_id,
          adjustment_type: dto.adjustment_type,
          amount: String(dto.amount),
          adjustment_date: dto.adjustment_date,
          description: dto.description ?? null,
          reason: dto.reason,
          source_record_type: dto.source_record_type,
          source_record_id: dto.source_record_id,
          source_record_number: dto.source_record_number ?? null,
          traveller_id: dto.traveller_id ?? expense.traveller_id ?? null,
          registration_id:
            dto.registration_id ?? expense.registration_id ?? null,
          travel_group_id:
            dto.travel_group_id ?? expense.travel_group_id ?? null,
          created_by: actorId,
          updated_by: actorId,
        });
        return this.getAdjustment(id);
      } catch (err: any) {
        if (this.isDuplicateEntryError(err)) {
          // Distinguish duplicate adjustment_number from duplicate
          // (expense_id, adjustment_type) by inspecting the MySQL error
          // message, which includes the conflicting key name.
          const msg = String(err?.message ?? '');
          if (this.isDuplicateAdjustmentNumber(msg)) {
            // Number collision — retry with a new number
            continue;
          }
          // Business uniqueness conflict: (expense_id, adjustment_type)
          throw new ConflictException(
            `An adjustment of type ${dto.adjustment_type} already exists for this expense`,
          );
        }
        throw err;
      }
    }

    // Exhausted retries on number collision
    throw new ConflictException(
      `Could not generate a unique adjustment number after ${MAX_NUMBER_RETRIES} attempts (last: ${lastNumber})`,
    );
  }

  async archiveAdjustment(id: string, actorId: string) {
    await this.getAdjustmentOrThrow(id);
    await this.db
      .update(schema.expenseAdjustments)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.expenseAdjustments.id, id));
  }

  /**
   * Returns all non-deleted adjustments for an expense.
   */
  async listAdjustmentsForExpense(expenseId: string) {
    const rows = await this.db
      .select()
      .from(schema.expenseAdjustments)
      .where(
        and(
          eq(schema.expenseAdjustments.expense_id, expenseId),
          eq(schema.expenseAdjustments.is_deleted, false),
        ),
      )
      .orderBy(desc(schema.expenseAdjustments.adjustment_date));
    return rows.map((row) => this.mapAdjustmentRow(row));
  }

  /**
   * Returns the sum of all adjustment amounts for an expense.
   * Positive = additional cost. Negative = recovery.
   */
  async getTotalAdjustmentsForExpense(expenseId: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenseAdjustments.amount}), 0)`,
      })
      .from(schema.expenseAdjustments)
      .where(
        and(
          eq(schema.expenseAdjustments.expense_id, expenseId),
          eq(schema.expenseAdjustments.is_deleted, false),
        ),
      );
    return toTwoDecimals(Number(row?.total ?? 0));
  }

  /**
   * Returns all adjustments linked to a specific source operational record.
   * Used to find adjustments for a flight booking, hotel stay, etc.
   */
  async listAdjustmentsForSource(
    sourceRecordId: string,
    sourceRecordType:
      | 'FLIGHT_BOOKING'
      | 'GROUP_HOTEL_STAY'
      | 'TRANSPORT_SEGMENT'
      | 'VISA_APPLICATION'
      | 'REGISTRATION',
  ) {
    const rows = await this.db
      .select()
      .from(schema.expenseAdjustments)
      .where(
        and(
          eq(schema.expenseAdjustments.source_record_id, sourceRecordId),
          eq(schema.expenseAdjustments.source_record_type, sourceRecordType),
          eq(schema.expenseAdjustments.is_deleted, false),
        ),
      )
      .orderBy(desc(schema.expenseAdjustments.adjustment_date));
    return rows.map((row) => this.mapAdjustmentRow(row));
  }

  // ---- Private helpers ----

  private async getAdjustmentOrThrow(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.expenseAdjustments)
      .where(
        and(
          eq(schema.expenseAdjustments.id, id),
          eq(schema.expenseAdjustments.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Expense adjustment not found');
    return row;
  }

  private async generateAdjustmentNumber() {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(schema.expenseAdjustments.adjustment_number) })
      .from(schema.expenseAdjustments)
      .where(
        like(schema.expenseAdjustments.adjustment_number, `ADJ-${year}-%`),
      );
    let next = 1;
    if (row?.max) {
      const parts = (row.max as string).split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `ADJ-${year}-${String(next).padStart(6, '0')}`;
  }

  /**
   * Returns true when the MySQL error is a duplicate-entry (ER_DUP_ENTRY)
   * violation, which fires on any unique constraint conflict.
   */
  private isDuplicateEntryError(err: any): boolean {
    return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
  }

  /**
   * Inspects the MySQL duplicate-entry error message to determine whether
   * the conflict is on the `adjustment_number` unique key (a number
   * generation race) rather than the `(expense_id, adjustment_type)`
   * business uniqueness key.
   *
   * MySQL includes the conflicting key name in the error message, e.g.:
   *   "Duplicate entry 'ADJ-2026-000001' for key 'adjustment_number'"
   *   "Duplicate entry 'exp-1-SUPPLIER_REFUND' for key 'expense_adjustments_expense_type_unique'"
   */
  private isDuplicateAdjustmentNumber(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes("for key 'adjustment_number'") ||
      lower.includes('for key "adjustment_number"') ||
      // Fallback: if the message contains the ADJ- prefix pattern, it's a
      // number collision.
      /adj-\d{4}-\d{6}/i.test(message)
    );
  }

  private mapAdjustmentRow(row: typeof schema.expenseAdjustments.$inferSelect) {
    return {
      id: row.id,
      adjustment_number: row.adjustment_number,
      expense_id: row.expense_id,
      adjustment_type: row.adjustment_type,
      amount: row.amount,
      adjustment_date: row.adjustment_date,
      description: row.description,
      reason: row.reason,
      source_record_type: row.source_record_type,
      source_record_id: row.source_record_id,
      source_record_number: row.source_record_number,
      traveller_id: row.traveller_id,
      registration_id: row.registration_id,
      travel_group_id: row.travel_group_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapListRow(row: any) {
    const adj = row.expense_adjustments;
    return {
      id: adj.id,
      adjustment_number: adj.adjustment_number,
      expense_id: adj.expense_id,
      adjustment_type: adj.adjustment_type,
      amount: adj.amount,
      adjustment_date: adj.adjustment_date,
      description: adj.description,
      reason: adj.reason,
      source_record_type: adj.source_record_type,
      source_record_id: adj.source_record_id,
      source_record_number: adj.source_record_number,
      traveller_id: adj.traveller_id,
      registration_id: adj.registration_id,
      travel_group_id: adj.travel_group_id,
      expense: row.expenses
        ? {
            id: row.expenses.id,
            expense_number: row.expenses.expense_number,
            amount: row.expenses.amount,
          }
        : null,
      created_at: adj.created_at,
      updated_at: adj.updated_at,
    };
  }
}
