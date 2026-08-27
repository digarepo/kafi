import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, eq, gte, isNull, lt, ne, not, or, sql } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';

/**
 * Thin read-only aggregation service for the staff dashboard.
 *
 * The dashboard does not own any business aggregates; it composes counts
 * and computed conditions from the existing travellers, operations, and
 * finance contexts.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async getDashboard() {
    const t0 = performance.now();
    this._lastTimings = {};

    const labels = [
      'registrations_needing_processing',
      'registrations_ready_for_travel',
      'registrations_ready_for_group',
      'registrations_with_outstanding_balance',
      'groups_requiring_preparation',
      'groups_ready_to_depart',
      'upcoming_departures',
    ] as const;

    const queries = [
      this.timed(labels[0], () => this.countRegistrationsByStatus('DRAFT')),
      this.timed(labels[1], () =>
        this.countRegistrationsByStatus('READY_FOR_TRAVEL'),
      ),
      this.timed(labels[2], () => this.countRegistrationsReadyForGroup()),
      this.timed(labels[3], () =>
        this.countRegistrationsWithOutstandingBalance(),
      ),
      this.timed(labels[4], () => this.countGroupsByStatus('PLANNING')),
      this.timed(labels[5], () => this.countGroupsByStatus('TRAVEL_PREPARED')),
      this.timed(labels[6], () => this.countUpcomingDepartures()),
    ];

    const results = await Promise.all(queries);
    this._lastTimings.total = Math.round(performance.now() - t0);

    this.logger.log(`[dashboard] ${JSON.stringify(this._lastTimings)}`);

    return {
      registrations_needing_processing: results[0],
      registrations_ready_for_travel: results[1],
      registrations_ready_for_group: results[2],
      registrations_with_outstanding_balance: results[3],
      groups_requiring_preparation: results[4],
      groups_ready_to_depart: results[5],
      upcoming_departures: results[6],
      generated_at: new Date().toISOString(),
    };
  }

  private async timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    this._lastTimings[label] = Math.round(performance.now() - start);
    return result;
  }

  private _lastTimings: Record<string, number> = {};

  private async countRegistrationsByStatus(statusCode: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.registrations.is_deleted, false),
          eq(schema.registrationStatuses.status_code, statusCode),
        ),
      );
    return row?.value ?? 0;
  }

  /**
   * Registrations that are READY_FOR_TRAVEL and have no ACTIVE group
   * membership — the queue of travellers waiting for group assignment.
   */
  private async countRegistrationsReadyForGroup() {
    const [row] = await this.db
      .select({ value: count() })
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .leftJoin(
        schema.groupMemberships,
        and(
          eq(schema.groupMemberships.registration_id, schema.registrations.id),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .leftJoin(
        schema.groupMembershipStatuses,
        eq(
          schema.groupMemberships.group_membership_status_id,
          schema.groupMembershipStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.registrations.is_deleted, false),
          eq(schema.registrationStatuses.status_code, 'READY_FOR_TRAVEL'),
          or(
            isNull(schema.groupMembershipStatuses.status_code),
            ne(schema.groupMembershipStatuses.status_code, 'ACTIVE'),
          ),
        ),
      );
    return row?.value ?? 0;
  }

  private async countRegistrationsWithOutstandingBalance() {
    const allocationsByInvoice = this.db
      .select({
        invoiceId: schema.paymentAllocations.invoice_id,
        allocated:
          sql<number>`coalesce(sum(${schema.paymentAllocations.allocated_amount}), 0)`.as(
            'allocated',
          ),
      })
      .from(schema.paymentAllocations)
      .where(eq(schema.paymentAllocations.is_deleted, false))
      .groupBy(schema.paymentAllocations.invoice_id)
      .as('allocations_by_invoice');

    const rows = await this.db
      .select({ registrationId: schema.invoices.registration_id })
      .from(schema.invoices)
      .innerJoin(
        schema.invoiceStatuses,
        eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
      )
      .leftJoin(
        allocationsByInvoice,
        eq(allocationsByInvoice.invoiceId, schema.invoices.id),
      )
      .where(
        and(
          eq(schema.invoices.is_deleted, false),
          not(eq(schema.invoiceStatuses.status_code, 'CANCELLED')),
        ),
      )
      .groupBy(schema.invoices.registration_id)
      .having(
        sql`sum(${schema.invoices.total_amount}) > coalesce(sum(${allocationsByInvoice.allocated}), 0)`,
      );

    return rows.length;
  }

  private async countGroupsByStatus(statusCode: string) {
    const [row] = await this.db
      .select({ value: count() })
      .from(schema.travelGroups)
      .innerJoin(
        schema.travelGroupStatuses,
        eq(
          schema.travelGroups.travel_group_status_id,
          schema.travelGroupStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travelGroups.is_deleted, false),
          eq(schema.travelGroupStatuses.status_code, statusCode),
        ),
      );
    return row?.value ?? 0;
  }

  private async countUpcomingDepartures() {
    const today = new Date();
    const window = new Date(today);
    window.setDate(today.getDate() + 30);

    const [row] = await this.db
      .select({ value: count() })
      .from(schema.travelGroups)
      .innerJoin(
        schema.travelGroupStatuses,
        eq(
          schema.travelGroups.travel_group_status_id,
          schema.travelGroupStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travelGroups.is_deleted, false),
          not(eq(schema.travelGroupStatuses.status_code, 'CANCELLED')),
          not(eq(schema.travelGroupStatuses.status_code, 'COMPLETED')),
          gte(schema.travelGroups.departure_date, today),
          lt(schema.travelGroups.departure_date, window),
        ),
      );
    return row?.value ?? 0;
  }
}
