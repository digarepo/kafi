import { Inject, Injectable } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq, or, sql, inArray } from 'drizzle-orm';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

function toTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Server-backed financial reporting queries.
 *
 * @remarks
 * - All calculations are performed server-side.
 * - Supports flexible filtering by date range, traveler, registration,
 *   travel group, package version, expense category, and expense source.
 * - Reports revenue, cash collected, outstanding, expenses, profit/loss,
 *   unallocated money, authorized credit, and refunds/adjustments as
 *   separate values.
 */
@Injectable()
export class FinanceReportingService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Returns the overall finance dashboard summary.
   */
  async getDashboardSummary() {
    const [
      [revenueRow],
      [collectedRow],
      [expenseRow],
      [adjustmentRow],
      [refundRow],
      [creditRow],
    ] = await Promise.all([
      this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.invoices.total_amount}), 0)`,
        })
        .from(schema.invoices)
        .innerJoin(
          schema.invoiceStatuses,
          eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
        )
        .where(
          and(
            eq(schema.invoices.is_deleted, false),
            sql`${schema.invoiceStatuses.status_code} != 'CANCELLED'`,
          ),
        ),
      this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
        })
        .from(schema.paymentAllocations)
        .innerJoin(
          schema.payments,
          eq(schema.paymentAllocations.payment_id, schema.payments.id),
        )
        .innerJoin(
          schema.paymentStatuses,
          eq(schema.payments.payment_status_id, schema.paymentStatuses.id),
        )
        .where(
          and(
            eq(schema.paymentAllocations.is_deleted, false),
            eq(schema.payments.is_deleted, false),
            sql`${schema.paymentStatuses.status_code} != 'CANCELLED'`,
          ),
        ),
      this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.expenses.amount}), 0)`,
        })
        .from(schema.expenses)
        .innerJoin(
          schema.expenseStatuses,
          eq(schema.expenses.expense_status_id, schema.expenseStatuses.id),
        )
        .where(
          and(
            eq(schema.expenses.is_deleted, false),
            eq(schema.expenseStatuses.status_code, 'CONFIRMED'),
          ),
        ),
      // Expense adjustments (supplier refunds, cancellation fees, etc.)
      // Positive = additional cost. Negative = recovery.
      this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.expenseAdjustments.amount}), 0)`,
        })
        .from(schema.expenseAdjustments)
        .where(eq(schema.expenseAdjustments.is_deleted, false)),
      this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.refunds.amount}), 0)`,
        })
        .from(schema.refunds)
        .innerJoin(
          schema.refundStatuses,
          eq(schema.refunds.refund_status_id, schema.refundStatuses.id),
        )
        .where(
          and(
            eq(schema.refunds.is_deleted, false),
            sql`${schema.refundStatuses.status_code} IN ('APPROVED', 'COMPLETED')`,
          ),
        ),
      this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.financeExceptions.authorized_amount}), 0)`,
        })
        .from(schema.financeExceptions)
        .innerJoin(
          schema.financeExceptionStatuses,
          eq(
            schema.financeExceptions.finance_exception_status_id,
            schema.financeExceptionStatuses.id,
          ),
        )
        .where(
          and(
            eq(schema.financeExceptions.is_deleted, false),
            eq(schema.financeExceptionStatuses.status_code, 'ACTIVE'),
          ),
        ),
    ]);

    const totalRevenue = toTwoDecimals(Number(revenueRow?.total ?? 0));
    const totalCollected = toTwoDecimals(Number(collectedRow?.total ?? 0));
    const totalExpenses = toTwoDecimals(Number(expenseRow?.total ?? 0));
    const totalAdjustments = toTwoDecimals(Number(adjustmentRow?.total ?? 0));
    const netExpenses = toTwoDecimals(totalExpenses + totalAdjustments);
    const totalRefunds = toTwoDecimals(Number(refundRow?.total ?? 0));
    const totalCredit = toTwoDecimals(Number(creditRow?.total ?? 0));
    const outstanding = toTwoDecimals(totalRevenue - totalCollected);
    const profitLoss = toTwoDecimals(
      totalCollected - netExpenses - totalRefunds,
    );

    return {
      total_revenue: totalRevenue,
      total_collected: totalCollected,
      outstanding: outstanding,
      total_expenses: totalExpenses,
      total_adjustments: totalAdjustments,
      net_expenses: netExpenses,
      profit_loss: profitLoss,
      total_refunds: totalRefunds,
      authorized_credit: totalCredit,
    };
  }

  /**
   * Returns the finance summary for a specific registration.
   */
  async getRegistrationFinanceSummary(registrationId: string) {
    // Revenue (invoice totals, excluding cancelled)
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
          sql`${schema.invoiceStatuses.status_code} != 'CANCELLED'`,
        ),
      );

    const totalInvoiced = toTwoDecimals(
      invoiceRows.reduce((sum, r) => sum + Number(r.total_amount), 0),
    );

    const invoiceIds = invoiceRows.map((r) => r.id);
    let totalPaid = 0;
    if (invoiceIds.length > 0) {
      const [paidRow] = await this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
        })
        .from(schema.paymentAllocations)
        .where(
          and(
            inArray(schema.paymentAllocations.invoice_id, invoiceIds),
            eq(schema.paymentAllocations.is_deleted, false),
          ),
        );
      totalPaid = toTwoDecimals(Number(paidRow?.total ?? 0));
    }

    // Direct expenses for this registration
    const [directExpenseRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenses.amount}), 0)`,
      })
      .from(schema.expenses)
      .innerJoin(
        schema.expenseStatuses,
        eq(schema.expenses.expense_status_id, schema.expenseStatuses.id),
      )
      .where(
        and(
          eq(schema.expenses.registration_id, registrationId),
          eq(schema.expenses.is_deleted, false),
          eq(schema.expenseStatuses.status_code, 'CONFIRMED'),
        ),
      );
    const directExpenses = toTwoDecimals(Number(directExpenseRow?.total ?? 0));

    // Direct expense adjustments for this registration
    const [directAdjustmentRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenseAdjustments.amount}), 0)`,
      })
      .from(schema.expenseAdjustments)
      .where(
        and(
          eq(schema.expenseAdjustments.registration_id, registrationId),
          eq(schema.expenseAdjustments.is_deleted, false),
        ),
      );
    const directAdjustments = toTwoDecimals(
      Number(directAdjustmentRow?.total ?? 0),
    );

    // Allocated group expenses for this registration's traveler
    const [registrationRow] = await this.db
      .select({ traveller_id: schema.registrations.traveller_id })
      .from(schema.registrations)
      .where(eq(schema.registrations.id, registrationId))
      .limit(1);

    let allocatedGroupExpenses = 0;
    if (registrationRow?.traveller_id) {
      const [allocExpenseRow] = await this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.expenseAllocations.allocated_amount}), 0)`,
        })
        .from(schema.expenseAllocations)
        .where(
          and(
            eq(
              schema.expenseAllocations.traveller_id,
              registrationRow.traveller_id,
            ),
            eq(schema.expenseAllocations.is_deleted, false),
          ),
        );
      allocatedGroupExpenses = toTwoDecimals(
        Number(allocExpenseRow?.total ?? 0),
      );
    }

    // Authorized credit
    let authorizedCredit = 0;
    const [creditRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.financeExceptions.authorized_amount}), 0)`,
      })
      .from(schema.financeExceptions)
      .innerJoin(
        schema.financeExceptionStatuses,
        eq(
          schema.financeExceptions.finance_exception_status_id,
          schema.financeExceptionStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.financeExceptions.registration_id, registrationId),
          eq(schema.financeExceptions.is_deleted, false),
          eq(schema.financeExceptionStatuses.status_code, 'ACTIVE'),
        ),
      );
    authorizedCredit = toTwoDecimals(Number(creditRow?.total ?? 0));

    // Refunds for this registration
    const [refundRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.refunds.amount}), 0)`,
      })
      .from(schema.refunds)
      .innerJoin(
        schema.refundStatuses,
        eq(schema.refunds.refund_status_id, schema.refundStatuses.id),
      )
      .where(
        and(
          eq(schema.refunds.registration_id, registrationId),
          eq(schema.refunds.is_deleted, false),
          sql`${schema.refundStatuses.status_code} IN ('APPROVED', 'COMPLETED')`,
        ),
      );
    const refunds = toTwoDecimals(Number(refundRow?.total ?? 0));

    const totalCost = toTwoDecimals(
      directExpenses + allocatedGroupExpenses + directAdjustments,
    );
    const outstanding = toTwoDecimals(totalInvoiced - totalPaid);
    const profitLoss = toTwoDecimals(totalPaid - totalCost - refunds);

    return {
      registration_id: registrationId,
      total_invoiced: totalInvoiced,
      total_paid: totalPaid,
      outstanding,
      authorized_credit: authorizedCredit,
      direct_expenses: directExpenses,
      direct_adjustments: directAdjustments,
      allocated_group_expenses: allocatedGroupExpenses,
      total_cost: totalCost,
      refunds,
      profit_loss: profitLoss,
    };
  }

  /**
   * Returns the finance summary for a travel group.
   */
  async getTravelGroupFinanceSummary(travelGroupId: string) {
    // Group revenue: sum of invoices for registrations that are members of this group
    const memberRows = await this.db
      .select({ registration_id: schema.groupMemberships.registration_id })
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.travel_group_id, travelGroupId),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      );

    const registrationIds = memberRows.map((r) => r.registration_id);
    let groupRevenue = 0;
    let groupCollected = 0;

    if (registrationIds.length > 0) {
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
            inArray(schema.invoices.registration_id, registrationIds),
            eq(schema.invoices.is_deleted, false),
            sql`${schema.invoiceStatuses.status_code} != 'CANCELLED'`,
          ),
        );

      groupRevenue = toTwoDecimals(
        invoiceRows.reduce((s, r) => s + Number(r.total_amount), 0),
      );

      const invoiceIds = invoiceRows.map((r) => r.id);
      if (invoiceIds.length > 0) {
        const [collectedRow] = await this.db
          .select({
            total: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
          })
          .from(schema.paymentAllocations)
          .where(
            and(
              inArray(schema.paymentAllocations.invoice_id, invoiceIds),
              eq(schema.paymentAllocations.is_deleted, false),
            ),
          );
        groupCollected = toTwoDecimals(Number(collectedRow?.total ?? 0));
      }
    }

    // Actual group expenses
    const [expenseRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenses.amount}), 0)`,
      })
      .from(schema.expenses)
      .innerJoin(
        schema.expenseStatuses,
        eq(schema.expenses.expense_status_id, schema.expenseStatuses.id),
      )
      .where(
        and(
          eq(schema.expenses.travel_group_id, travelGroupId),
          eq(schema.expenses.is_deleted, false),
          eq(schema.expenseStatuses.status_code, 'CONFIRMED'),
        ),
      );
    const groupExpenses = toTwoDecimals(Number(expenseRow?.total ?? 0));

    // Group expense adjustments (supplier refunds, cancellation fees)
    const [groupAdjustmentRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenseAdjustments.amount}), 0)`,
      })
      .from(schema.expenseAdjustments)
      .where(
        and(
          eq(schema.expenseAdjustments.travel_group_id, travelGroupId),
          eq(schema.expenseAdjustments.is_deleted, false),
        ),
      );
    const groupAdjustments = toTwoDecimals(
      Number(groupAdjustmentRow?.total ?? 0),
    );
    const netGroupExpenses = toTwoDecimals(groupExpenses + groupAdjustments);

    const outstanding = toTwoDecimals(groupRevenue - groupCollected);
    const profitLoss = toTwoDecimals(groupCollected - netGroupExpenses);

    return {
      travel_group_id: travelGroupId,
      group_revenue: groupRevenue,
      group_collected: groupCollected,
      outstanding,
      actual_group_expenses: groupExpenses,
      total_adjustments: groupAdjustments,
      net_expenses: netGroupExpenses,
      profit_loss: profitLoss,
    };
  }

  /**
   * Returns the finance summary for a package version.
   */
  async getPackageVersionFinanceSummary(packageVersionId: string) {
    // Get all travel groups for this package version
    const groupRows = await this.db
      .select({ id: schema.travelGroups.id })
      .from(schema.travelGroups)
      .where(
        and(
          eq(schema.travelGroups.package_version_id, packageVersionId),
          eq(schema.travelGroups.is_deleted, false),
        ),
      );

    const groupIds = groupRows.map((r) => r.id);

    // Expenses for this package version (direct + group-linked)
    const [expenseRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenses.amount}), 0)`,
      })
      .from(schema.expenses)
      .innerJoin(
        schema.expenseStatuses,
        eq(schema.expenses.expense_status_id, schema.expenseStatuses.id),
      )
      .where(
        and(
          eq(schema.expenses.package_version_id, packageVersionId),
          eq(schema.expenses.is_deleted, false),
          eq(schema.expenseStatuses.status_code, 'CONFIRMED'),
        ),
      );
    const totalExpenses = toTwoDecimals(Number(expenseRow?.total ?? 0));

    // Revenue: invoices for registrations in groups of this package version
    let totalRevenue = 0;
    let totalCollected = 0;

    if (groupIds.length > 0) {
      const memberRows = await this.db
        .select({
          registration_id: schema.groupMemberships.registration_id,
        })
        .from(schema.groupMemberships)
        .where(
          and(
            inArray(schema.groupMemberships.travel_group_id, groupIds),
            eq(schema.groupMemberships.is_deleted, false),
          ),
        );

      const registrationIds = memberRows.map((r) => r.registration_id);
      if (registrationIds.length > 0) {
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
              inArray(schema.invoices.registration_id, registrationIds),
              eq(schema.invoices.is_deleted, false),
              sql`${schema.invoiceStatuses.status_code} != 'CANCELLED'`,
            ),
          );

        totalRevenue = toTwoDecimals(
          invoiceRows.reduce((s, r) => s + Number(r.total_amount), 0),
        );

        const invoiceIds = invoiceRows.map((r) => r.id);
        if (invoiceIds.length > 0) {
          const [collectedRow] = await this.db
            .select({
              total: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
            })
            .from(schema.paymentAllocations)
            .where(
              and(
                inArray(schema.paymentAllocations.invoice_id, invoiceIds),
                eq(schema.paymentAllocations.is_deleted, false),
              ),
            );
          totalCollected = toTwoDecimals(Number(collectedRow?.total ?? 0));
        }
      }
    }

    // Expense adjustments for this package version (via travel group IDs)
    let totalAdjustments = 0;
    if (groupIds.length > 0) {
      const [adjustmentRow] = await this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.expenseAdjustments.amount}), 0)`,
        })
        .from(schema.expenseAdjustments)
        .where(
          and(
            inArray(schema.expenseAdjustments.travel_group_id, groupIds),
            eq(schema.expenseAdjustments.is_deleted, false),
          ),
        );
      totalAdjustments = toTwoDecimals(Number(adjustmentRow?.total ?? 0));
    }
    const netExpenses = toTwoDecimals(totalExpenses + totalAdjustments);

    const outstanding = toTwoDecimals(totalRevenue - totalCollected);
    const profitLoss = toTwoDecimals(totalCollected - netExpenses);

    return {
      package_version_id: packageVersionId,
      total_revenue: totalRevenue,
      total_collected: totalCollected,
      outstanding,
      total_expenses: totalExpenses,
      total_adjustments: totalAdjustments,
      net_expenses: netExpenses,
      profit_loss: profitLoss,
    };
  }

  /**
   * Flexible financial report with server-side filtering and aggregation.
   *
   * @remarks
   * This is the single underlying reporting query that supports all
   * date-range contexts (monthly, quarterly, seasonal, annual, custom).
   * All aggregation happens server-side; the React client never computes
   * authoritative totals.
   *
   * Filters:
   * - date_from / date_to: applied to invoice dates, payment dates, and
   *   expense dates as appropriate for each metric.
   * - traveller_id, registration_id, travel_group_id, package_version_id:
   *   scope the report to a specific business entity.
   * - expense_category_id, expense_source_id: filter expense breakdown.
   *
   * Returns all metrics in one server-side response:
   * revenue, collected, outstanding, expenses, profit/loss, unallocated,
   * authorized credit, refunds.
   */
  async getFlexibleReport(filters: {
    date_from?: string;
    date_to?: string;
    traveller_id?: string;
    registration_id?: string;
    travel_group_id?: string;
    package_version_id?: string;
    expense_category_id?: string;
    expense_source_id?: string;
  }) {
    const {
      date_from,
      date_to,
      traveller_id,
      registration_id,
      travel_group_id,
      package_version_id,
      expense_category_id,
      expense_source_id,
    } = filters;

    // ---- Resolve registration scope ----
    // If a traveller, travel group, or package version is specified,
    // resolve to the set of registration_ids in scope.
    let registrationIds: string[] | null = null;
    // When filtering by travel_group_id or package_version_id, also
    // resolve the set of travel_group_ids in scope so that group-level
    // expense adjustments (which carry travel_group_id directly) can be
    // included alongside registration-scoped adjustments.
    let groupIdsForScope: string[] | null = null;

    if (registration_id) {
      registrationIds = [registration_id];
    } else if (traveller_id) {
      const rows = await this.db
        .select({ id: schema.registrations.id })
        .from(schema.registrations)
        .where(
          and(
            eq(schema.registrations.traveller_id, traveller_id),
            eq(schema.registrations.is_deleted, false),
          ),
        );
      registrationIds = rows.map((r) => r.id);
    } else if (travel_group_id) {
      const rows = await this.db
        .select({
          registration_id: schema.groupMemberships.registration_id,
        })
        .from(schema.groupMemberships)
        .where(
          and(
            eq(schema.groupMemberships.travel_group_id, travel_group_id),
            eq(schema.groupMemberships.is_deleted, false),
          ),
        );
      registrationIds = rows.map((r) => r.registration_id);
      groupIdsForScope = [travel_group_id];
    } else if (package_version_id) {
      const groupRows = await this.db
        .select({ id: schema.travelGroups.id })
        .from(schema.travelGroups)
        .where(
          and(
            eq(schema.travelGroups.package_version_id, package_version_id),
            eq(schema.travelGroups.is_deleted, false),
          ),
        );
      const groupIds = groupRows.map((r) => r.id);
      groupIdsForScope = groupIds.length > 0 ? groupIds : null;
      if (groupIds.length > 0) {
        const memberRows = await this.db
          .select({
            registration_id: schema.groupMemberships.registration_id,
          })
          .from(schema.groupMemberships)
          .where(
            and(
              inArray(schema.groupMemberships.travel_group_id, groupIds),
              eq(schema.groupMemberships.is_deleted, false),
            ),
          );
        registrationIds = memberRows.map((r) => r.registration_id);
      } else {
        registrationIds = [];
      }
    }

    // ---- Revenue (invoices) ----
    const invoiceFilters = [
      eq(schema.invoices.is_deleted, false),
      sql`${schema.invoiceStatuses.status_code} != 'CANCELLED'`,
    ];
    if (registrationIds !== null) {
      if (registrationIds.length === 0) {
        // No registrations in scope. If the scope includes group-level
        // financial activity (travel_group_id or package_version_id),
        // continue so that group expenses/adjustments are still reported.
        // Otherwise, return an empty report.
        if (!groupIdsForScope || groupIdsForScope.length === 0) {
          return this.emptyReport();
        }
        // Use a sentinel that matches no rows so invoice/collected queries
        // return zero without short-circuiting the entire report.
        invoiceFilters.push(sql`1 = 0`);
      } else {
        invoiceFilters.push(
          inArray(schema.invoices.registration_id, registrationIds),
        );
      }
    }
    if (date_from)
      invoiceFilters.push(
        sql`${schema.invoices.invoice_date} >= ${new Date(date_from)}`,
      );
    if (date_to)
      invoiceFilters.push(
        sql`${schema.invoices.invoice_date} <= ${new Date(date_to)}`,
      );

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
      .where(and(...invoiceFilters));

    const totalRevenue = toTwoDecimals(
      invoiceRows.reduce((s, r) => s + Number(r.total_amount), 0),
    );
    const invoiceIds = invoiceRows.map((r) => r.id);

    // ---- Collected (payment allocations) ----
    let totalCollected = 0;
    if (invoiceIds.length > 0) {
      const allocFilters = [
        eq(schema.paymentAllocations.is_deleted, false),
        inArray(schema.paymentAllocations.invoice_id, invoiceIds),
      ];
      const [collectedRow] = await this.db
        .select({
          total: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
        })
        .from(schema.paymentAllocations)
        .where(and(...allocFilters));
      totalCollected = toTwoDecimals(Number(collectedRow?.total ?? 0));
    }

    // ---- Expenses ----
    // When filtering by travel group, include both traveler-attributed
    // expenses (via registration_id) and group-attributed expenses (via
    // travel_group_id) so that accommodation/transport costs are not
    // excluded from the report.
    const expenseFilters = [
      eq(schema.expenses.is_deleted, false),
      eq(schema.expenseStatuses.status_code, 'CONFIRMED'),
    ];
    if (registrationIds !== null) {
      if (travel_group_id) {
        expenseFilters.push(
          or(
            inArray(schema.expenses.registration_id, registrationIds),
            eq(schema.expenses.travel_group_id, travel_group_id),
          )!,
        );
      } else {
        expenseFilters.push(
          inArray(schema.expenses.registration_id, registrationIds),
        );
      }
    }
    if (expense_category_id)
      expenseFilters.push(
        eq(schema.expenses.expense_category_id, expense_category_id),
      );
    if (expense_source_id)
      expenseFilters.push(
        eq(schema.expenses.expense_source_id, expense_source_id),
      );
    if (date_from)
      expenseFilters.push(
        sql`${schema.expenses.expense_date} >= ${new Date(date_from)}`,
      );
    if (date_to)
      expenseFilters.push(
        sql`${schema.expenses.expense_date} <= ${new Date(date_to)}`,
      );

    const [expenseRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenses.amount}), 0)`,
      })
      .from(schema.expenses)
      .innerJoin(
        schema.expenseStatuses,
        eq(schema.expenses.expense_status_id, schema.expenseStatuses.id),
      )
      .where(and(...expenseFilters));
    const totalExpenses = toTwoDecimals(Number(expenseRow?.total ?? 0));

    // ---- Expense adjustments ----
    // Adjustments carry both registration_id and travel_group_id columns.
    // For group/package-scoped reports, include adjustments linked to any
    // group in scope (e.g. accommodation/transport adjustments) in addition
    // to registration-scoped adjustments. Use OR so that an adjustment is
    // counted once even if both dimensions are populated.
    const adjustmentFilters = [eq(schema.expenseAdjustments.is_deleted, false)];
    if (registrationIds !== null) {
      if (groupIdsForScope && groupIdsForScope.length > 0) {
        adjustmentFilters.push(
          or(
            inArray(schema.expenseAdjustments.registration_id, registrationIds),
            inArray(
              schema.expenseAdjustments.travel_group_id,
              groupIdsForScope,
            ),
          )!,
        );
      } else {
        adjustmentFilters.push(
          inArray(schema.expenseAdjustments.registration_id, registrationIds),
        );
      }
    }
    if (date_from)
      adjustmentFilters.push(
        sql`${schema.expenseAdjustments.adjustment_date} >= ${new Date(date_from)}`,
      );
    if (date_to)
      adjustmentFilters.push(
        sql`${schema.expenseAdjustments.adjustment_date} <= ${new Date(date_to)}`,
      );

    const [adjustmentRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.expenseAdjustments.amount}), 0)`,
      })
      .from(schema.expenseAdjustments)
      .where(and(...adjustmentFilters));
    const totalAdjustments = toTwoDecimals(Number(adjustmentRow?.total ?? 0));
    const netExpenses = toTwoDecimals(totalExpenses + totalAdjustments);

    // ---- Refunds ----
    // Refunds do not carry a travel_group_id column. A refund may be
    // linked to a registration directly (registration_id) or only to a
    // payment/payer. For group/package-scoped reports, resolve the full
    // set of refund registration_ids by also tracing
    //   refund.payment_id → payment_allocations.invoice_id → invoices.registration_id
    // so that refunds without an explicit registration_id are still
    // attributed to the correct group/package scope.
    const refundFilters = [
      eq(schema.refunds.is_deleted, false),
      sql`${schema.refundStatuses.status_code} IN ('APPROVED', 'COMPLETED')`,
    ];
    if (registrationIds !== null) {
      // Resolve additional registration_ids from the payment-allocation
      // chain so refunds without an explicit registration_id are included.
      let refundRegistrationIds = registrationIds;
      if (invoiceIds.length > 0) {
        const paymentRegRows = await this.db
          .select({
            payment_id: schema.paymentAllocations.payment_id,
          })
          .from(schema.paymentAllocations)
          .where(
            and(
              inArray(schema.paymentAllocations.invoice_id, invoiceIds),
              eq(schema.paymentAllocations.is_deleted, false),
            ),
          );
        const paymentIds = [
          ...new Set(paymentRegRows.map((r) => r.payment_id)),
        ];
        if (paymentIds.length > 0) {
          // Include refunds whose payment_id maps to a payment allocated
          // to an invoice in scope, even if registration_id is null.
          refundFilters.push(
            or(
              inArray(schema.refunds.registration_id, registrationIds),
              inArray(schema.refunds.payment_id, paymentIds),
            )!,
          );
        } else {
          refundFilters.push(
            inArray(schema.refunds.registration_id, registrationIds),
          );
        }
      } else {
        refundFilters.push(
          inArray(schema.refunds.registration_id, registrationIds),
        );
      }
    }
    if (date_from)
      refundFilters.push(
        sql`${schema.refunds.refund_date} >= ${new Date(date_from)}`,
      );
    if (date_to)
      refundFilters.push(
        sql`${schema.refunds.refund_date} <= ${new Date(date_to)}`,
      );

    const [refundRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.refunds.amount}), 0)`,
      })
      .from(schema.refunds)
      .innerJoin(
        schema.refundStatuses,
        eq(schema.refunds.refund_status_id, schema.refundStatuses.id),
      )
      .where(and(...refundFilters));
    const totalRefunds = toTwoDecimals(Number(refundRow?.total ?? 0));

    // ---- Authorized credit ----
    const creditFilters = [
      eq(schema.financeExceptions.is_deleted, false),
      eq(schema.financeExceptionStatuses.status_code, 'ACTIVE'),
    ];
    if (registrationIds !== null) {
      creditFilters.push(
        inArray(schema.financeExceptions.registration_id, registrationIds),
      );
    }
    const [creditRow] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${schema.financeExceptions.authorized_amount}), 0)`,
      })
      .from(schema.financeExceptions)
      .innerJoin(
        schema.financeExceptionStatuses,
        eq(
          schema.financeExceptions.finance_exception_status_id,
          schema.financeExceptionStatuses.id,
        ),
      )
      .where(and(...creditFilters));
    const authorizedCredit = toTwoDecimals(Number(creditRow?.total ?? 0));

    // ---- Unallocated customer money ----
    const unallocFilters = [
      eq(schema.payments.is_deleted, false),
      sql`${schema.paymentStatuses.status_code} != 'CANCELLED'`,
    ];
    if (date_from)
      unallocFilters.push(
        sql`${schema.payments.payment_date} >= ${new Date(date_from)}`,
      );
    if (date_to)
      unallocFilters.push(
        sql`${schema.payments.payment_date} <= ${new Date(date_to)}`,
      );

    const [unallocRow] = await this.db
      .select({
        total_amount: sql<number>`coalesce(sum(${schema.payments.amount}), 0)`,
        allocated: sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`,
      })
      .from(schema.payments)
      .leftJoin(
        schema.paymentAllocations,
        and(
          eq(schema.paymentAllocations.payment_id, schema.payments.id),
          eq(schema.paymentAllocations.is_deleted, false),
        ),
      )
      .innerJoin(
        schema.paymentStatuses,
        eq(schema.payments.payment_status_id, schema.paymentStatuses.id),
      )
      .where(and(...unallocFilters));
    const unallocated = toTwoDecimals(
      Number(unallocRow?.total_amount ?? 0) -
        Number(unallocRow?.allocated ?? 0),
    );

    const outstanding = toTwoDecimals(totalRevenue - totalCollected);
    const profitLoss = toTwoDecimals(
      totalCollected - netExpenses - totalRefunds,
    );

    return {
      total_revenue: totalRevenue,
      total_collected: totalCollected,
      outstanding,
      total_expenses: totalExpenses,
      total_adjustments: totalAdjustments,
      net_expenses: netExpenses,
      profit_loss: profitLoss,
      total_refunds: totalRefunds,
      authorized_credit: authorizedCredit,
      unallocated_customer_money: unallocated,
    };
  }

  private emptyReport() {
    return {
      total_revenue: 0,
      total_collected: 0,
      outstanding: 0,
      total_expenses: 0,
      total_adjustments: 0,
      net_expenses: 0,
      profit_loss: 0,
      total_refunds: 0,
      authorized_credit: 0,
      unallocated_customer_money: 0,
    };
  }
}
