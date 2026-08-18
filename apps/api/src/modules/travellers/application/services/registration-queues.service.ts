import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { and, asc, eq, inArray, isNull, not } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { InvoicesService } from '../../../finance/application/services/invoices.service.js';
import { RegistrationReadinessService } from './registration-readiness.service.js';

export interface RegistrationQueueItem {
  id: string;
  registration_number: string;
  registration_date: string | Date;
  expected_departure_date: string | Date | null;
  expected_return_date: string | Date | null;
  status: { id: string; code: string; name: string } | null;
  traveller: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    traveller_number: string;
    phone_number: string;
  } | null;
  package_version: { id: string; version_name: string } | null;
  outstanding_balance: number;
  blockers: string[];
}

/**
 * Computed operational queues for registrations.
 *
 * These are read-only views; no workflow states are introduced or modified.
 */
@Injectable()
export class RegistrationQueuesService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly invoices: InvoicesService,
    private readonly readiness: RegistrationReadinessService,
  ) {}

  /**
   * Registrations in PROCESSING that fail the ready-for-travel check.
   */
  async getBlockedFromReadyQueue(): Promise<RegistrationQueueItem[]> {
    const processingStatus = await this.db
      .select({ id: schema.registrationStatuses.id })
      .from(schema.registrationStatuses)
      .where(eq(schema.registrationStatuses.status_code, 'PROCESSING'))
      .limit(1);
    if (processingStatus.length === 0) return [];

    const rows = await this.db
      .select()
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .innerJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .innerJoin(
        schema.packageVersions,
        eq(schema.registrations.package_version_id, schema.packageVersions.id),
      )
      .where(
        and(
          eq(schema.registrations.is_deleted, false),
          eq(
            schema.registrations.registration_status_id,
            processingStatus[0].id,
          ),
        ),
      )
      .orderBy(asc(schema.registrations.created_at));

    const ids = rows.map((r) => r.registrations.id);
    if (ids.length === 0) return [];

    const readiness =
      await this.readiness.getReadinessDetailsForRegistrations(ids);

    return rows
      .filter((r) => {
        const details = readiness.get(r.registrations.id);
        return details && !details.can_confirm_ready;
      })
      .map((r) => ({
        id: r.registrations.id,
        registration_number: r.registrations.registration_number,
        registration_date: r.registrations.registration_date,
        expected_departure_date: r.registrations.expected_departure_date,
        expected_return_date: r.registrations.expected_return_date,
        status: r.registration_statuses
          ? {
              id: r.registration_statuses.id,
              code: r.registration_statuses.status_code,
              name: r.registration_statuses.name,
            }
          : null,
        traveller: r.travellers
          ? {
              id: r.travellers.id,
              first_name: r.travellers.first_name,
              last_name: r.travellers.last_name,
              full_name:
                `${r.travellers.first_name} ${r.travellers.last_name}`.trim(),
              traveller_number: r.travellers.traveller_number,
              phone_number: r.travellers.phone_number,
            }
          : null,
        package_version: r.package_versions
          ? {
              id: r.package_versions.id,
              version_name: r.package_versions.version_name,
            }
          : null,
        outstanding_balance: 0,
        blockers: readiness.get(r.registrations.id)?.blockers ?? [],
      }));
  }

  /**
   * Active registrations with an outstanding balance.
   */
  async getUnpaidQueue(): Promise<RegistrationQueueItem[]> {
    const activeRows = await this.db
      .select({ id: schema.registrations.id })
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
          not(eq(schema.registrationStatuses.status_code, 'CANCELLED')),
        ),
      );

    const ids = activeRows.map((r) => r.id);
    if (ids.length === 0) return [];

    const finance = await this.invoices.getRegistrationFinanceSummaries(ids);
    const unpaidIds = ids.filter((id) => {
      const summary = finance.get(id);
      return summary && summary.outstanding_balance > 0;
    });

    if (unpaidIds.length === 0) return [];

    const rows = await this.db
      .select()
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .innerJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .innerJoin(
        schema.packageVersions,
        eq(schema.registrations.package_version_id, schema.packageVersions.id),
      )
      .where(
        and(
          inArray(schema.registrations.id, unpaidIds),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.registrations.created_at));

    return rows.map((r) => ({
      id: r.registrations.id,
      registration_number: r.registrations.registration_number,
      registration_date: r.registrations.registration_date,
      expected_departure_date: r.registrations.expected_departure_date,
      expected_return_date: r.registrations.expected_return_date,
      status: r.registration_statuses
        ? {
            id: r.registration_statuses.id,
            code: r.registration_statuses.status_code,
            name: r.registration_statuses.name,
          }
        : null,
      traveller: r.travellers
        ? {
            id: r.travellers.id,
            first_name: r.travellers.first_name,
            last_name: r.travellers.last_name,
            full_name:
              `${r.travellers.first_name} ${r.travellers.last_name}`.trim(),
            traveller_number: r.travellers.traveller_number,
            phone_number: r.travellers.phone_number,
          }
        : null,
      package_version: r.package_versions
        ? {
            id: r.package_versions.id,
            version_name: r.package_versions.version_name,
          }
        : null,
      outstanding_balance:
        finance.get(r.registrations.id)?.outstanding_balance ?? 0,
      blockers: ['OUTSTANDING_BALANCE'],
    }));
  }

  /**
   * Registrations that are READY_FOR_TRAVEL and have no ACTIVE group
   * membership. These are the travellers waiting to be assigned to a
   * compatible travel group.
   */
  async getReadyForGroupQueue(): Promise<RegistrationQueueItem[]> {
    const readyStatus = await this.db
      .select({ id: schema.registrationStatuses.id })
      .from(schema.registrationStatuses)
      .where(eq(schema.registrationStatuses.status_code, 'READY_FOR_TRAVEL'))
      .limit(1);
    if (readyStatus.length === 0) return [];

    const rows = await this.db
      .select()
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .innerJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .innerJoin(
        schema.packageVersions,
        eq(schema.registrations.package_version_id, schema.packageVersions.id),
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
          eq(schema.registrations.registration_status_id, readyStatus[0].id),
        ),
      )
      .orderBy(asc(schema.registrations.created_at));

    // Filter to registrations with no ACTIVE membership. A registration may
    // have historical CANCELLED/TRANSFERRED memberships but must not have a
    // current ACTIVE one.
    return rows
      .filter((r) => {
        const membershipStatus = r.group_membership_statuses?.status_code;
        return membershipStatus !== 'ACTIVE';
      })
      .map((r) => ({
        id: r.registrations.id,
        registration_number: r.registrations.registration_number,
        registration_date: r.registrations.registration_date,
        expected_departure_date: r.registrations.expected_departure_date,
        expected_return_date: r.registrations.expected_return_date,
        status: r.registration_statuses
          ? {
              id: r.registration_statuses.id,
              code: r.registration_statuses.status_code,
              name: r.registration_statuses.name,
            }
          : null,
        traveller: r.travellers
          ? {
              id: r.travellers.id,
              first_name: r.travellers.first_name,
              last_name: r.travellers.last_name,
              full_name:
                `${r.travellers.first_name} ${r.travellers.last_name}`.trim(),
              traveller_number: r.travellers.traveller_number,
              phone_number: r.travellers.phone_number,
            }
          : null,
        package_version: r.package_versions
          ? {
              id: r.package_versions.id,
              version_name: r.package_versions.version_name,
            }
          : null,
        outstanding_balance: 0,
        blockers: [],
      }));
  }
}
