import { Inject, Injectable } from '@nestjs/common';
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
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async getDashboard() {
    const [
      registrationsNeedingProcessing,
      registrationsReadyForTravel,
      registrationsReadyForGroup,
      registrationsWithOutstandingBalance,
      groupsRequiringPreparation,
      groupsReadyToDepart,
      upcomingDepartures,
    ] = await Promise.all([
      this.countRegistrationsByStatus('DRAFT'),
      this.countRegistrationsByStatus('READY_FOR_TRAVEL'),
      this.countRegistrationsReadyForGroup(),
      this.countRegistrationsWithOutstandingBalance(),
      this.countGroupsByStatus('PLANNING'),
      this.countGroupsByStatus('TRAVEL_PREPARED'),
      this.countUpcomingDepartures(),
    ]);

    return {
      registrations_needing_processing: registrationsNeedingProcessing,
      registrations_ready_for_travel: registrationsReadyForTravel,
      registrations_ready_for_group: registrationsReadyForGroup,
      registrations_with_outstanding_balance:
        registrationsWithOutstandingBalance,
      groups_requiring_preparation: groupsRequiringPreparation,
      groups_ready_to_depart: groupsReadyToDepart,
      upcoming_departures: upcomingDepartures,
      generated_at: new Date().toISOString(),
    };
  }

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
