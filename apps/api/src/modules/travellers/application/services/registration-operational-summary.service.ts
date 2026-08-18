import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { InvoicesService } from '../../../finance/application/services/invoices.service.js';
import { RegistrationsService } from './registrations.service.js';
import { RegistrationReadinessService } from './registration-readiness.service.js';

/**
 * Read-only operational summary for a registration.
 *
 * This service composes data from travellers, registrations, packages,
 * finance, documents, visa, and operations without mutating any of them.
 */
@Injectable()
export class RegistrationOperationalSummaryService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly registrations: RegistrationsService,
    private readonly invoices: InvoicesService,
    private readonly readiness: RegistrationReadinessService,
  ) {}

  async getOperationalSummary(registrationId: string) {
    const registration =
      await this.registrations.getRegistration(registrationId);
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    const [
      readiness,
      finance,
      documents,
      visas,
      flights,
      membership,
      invoiceList,
    ] = await Promise.all([
      this.readiness.getReadinessDetails(registrationId),
      this.invoices.getRegistrationFinanceSummaries([registrationId]).then(
        (m) =>
          m.get(registrationId) ?? {
            total_invoiced: 0,
            total_paid: 0,
            total_unallocated: 0,
            outstanding_balance: 0,
          },
      ),
      this.getDocumentsForTraveller(registration.traveller?.id),
      this.getVisasForRegistration(registrationId),
      this.getFlightsForRegistration(registrationId),
      this.getGroupMembership(registrationId),
      this.getInvoicesForRegistration(registrationId),
    ]);

    const room = membership
      ? await this.getRoomForMembership(membership.id)
      : null;

    return {
      id: registration.id,
      registration_number: registration.registration_number,
      registration_date: registration.registration_date,
      expected_departure_date: registration.expected_departure_date,
      expected_return_date: registration.expected_return_date,
      remarks: registration.remarks,
      status: registration.status,
      status_name: registration.status_name,
      traveller: registration.traveller,
      package_version: registration.package_version,
      package_template: registration.package_template,
      currency: registration.currency,
      base_price: registration.base_price,
      primary_contact: registration.primary_contact,
      season: registration.season,
      finance,
      invoices: invoiceList,
      documents,
      visas,
      flights,
      group_membership: membership,
      room_assignment: room,
      readiness,
      cancellation:
        registration.status === 'CANCELLED'
          ? await this.getCancellationInfo(registrationId)
          : null,
      created_at: registration.created_at,
      updated_at: registration.updated_at,
    };
  }

  private async getDocumentsForTraveller(travellerId: string | undefined) {
    if (!travellerId) return [];

    const rows = await this.db
      .select()
      .from(schema.documents)
      .leftJoin(
        schema.documentTypes,
        eq(schema.documents.document_type_id, schema.documentTypes.id),
      )
      .leftJoin(
        schema.documentStatuses,
        eq(schema.documents.document_status_id, schema.documentStatuses.id),
      )
      .leftJoin(
        schema.verificationStatuses,
        eq(
          schema.documents.verification_status_id,
          schema.verificationStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.documents.traveller_id, travellerId),
          eq(schema.documents.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.documents.created_at));

    return rows.map((row) => ({
      id: row.documents.id,
      file_name: row.documents.original_filename,
      expiry_date: row.documents.expiry_date,
      document_type: row.document_types
        ? {
            id: row.document_types.id,
            code: row.document_types.type_code,
            name: row.document_types.name,
          }
        : null,
      document_status: row.document_statuses
        ? {
            id: row.document_statuses.id,
            code: row.document_statuses.status_code,
            name: row.document_statuses.name,
          }
        : null,
      verification_status: row.verification_statuses
        ? {
            id: row.verification_statuses.id,
            code: row.verification_statuses.status_code,
            name: row.verification_statuses.name,
          }
        : null,
    }));
  }

  private async getVisasForRegistration(registrationId: string) {
    const rows = await this.db
      .select()
      .from(schema.visaApplications)
      .leftJoin(
        schema.visaApplicationStatuses,
        eq(
          schema.visaApplications.visa_application_status_id,
          schema.visaApplicationStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.visaApplications.registration_id, registrationId),
          eq(schema.visaApplications.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.visaApplications.created_at));

    return rows.map((row) => ({
      id: row.visa_applications.id,
      application_number: row.visa_applications.application_number,
      submission_date: row.visa_applications.submission_date,
      approval_date: row.visa_applications.approval_date,
      expiry_date: row.visa_applications.expiry_date,
      rejection_date: row.visa_applications.rejection_date,
      rejection_reason: row.visa_applications.rejection_reason,
      cancellation_date: row.visa_applications.cancellation_date,
      cancellation_reason: row.visa_applications.cancellation_reason,
      status: row.visa_application_statuses
        ? {
            id: row.visa_application_statuses.id,
            code: row.visa_application_statuses.status_code,
            name: row.visa_application_statuses.name,
          }
        : null,
    }));
  }

  private async getFlightsForRegistration(registrationId: string) {
    const rows = await this.db
      .select()
      .from(schema.flightBookings)
      .leftJoin(
        schema.flightBookingStatuses,
        eq(
          schema.flightBookings.flight_booking_status_id,
          schema.flightBookingStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.flightBookings.registration_id, registrationId),
          eq(schema.flightBookings.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.flightBookings.created_at));

    return rows.map((row) => ({
      id: row.flight_bookings.id,
      booking_number: row.flight_bookings.booking_number,
      pnr: row.flight_bookings.pnr,
      departure_flight_number: row.flight_bookings.departure_flight_number,
      departure_date: row.flight_bookings.departure_date,
      return_flight_number: row.flight_bookings.return_flight_number,
      return_date: row.flight_bookings.return_date,
      cancellation_date: row.flight_bookings.cancellation_date,
      cancellation_reason: row.flight_bookings.cancellation_reason,
      status: row.flight_booking_statuses
        ? {
            id: row.flight_booking_statuses.id,
            code: row.flight_booking_statuses.status_code,
            name: row.flight_booking_statuses.name,
          }
        : null,
    }));
  }

  private async getGroupMembership(registrationId: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMemberships)
      .innerJoin(
        schema.travelGroups,
        eq(schema.groupMemberships.travel_group_id, schema.travelGroups.id),
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
          eq(schema.groupMemberships.registration_id, registrationId),
          eq(schema.groupMemberships.is_deleted, false),
          eq(schema.travelGroups.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.groupMemberships.joined_at))
      .limit(1);

    if (!row) return null;

    return {
      id: row.group_memberships.id,
      travel_group_id: row.group_memberships.travel_group_id,
      group: row.travel_groups
        ? {
            id: row.travel_groups.id,
            group_number: row.travel_groups.group_number,
            name: row.travel_groups.name,
            departure_date: row.travel_groups.departure_date,
            return_date: row.travel_groups.return_date,
          }
        : null,
      guarantee_required: row.group_memberships.guarantee_required,
      guarantee_waived: row.group_memberships.guarantee_waived,
      joined_at: row.group_memberships.joined_at,
      left_at: row.group_memberships.left_at,
      status: row.group_membership_statuses
        ? {
            id: row.group_membership_statuses.id,
            code: row.group_membership_statuses.status_code,
            name: row.group_membership_statuses.name,
          }
        : null,
    };
  }

  private async getRoomForMembership(groupMembershipId: string) {
    const [row] = await this.db
      .select()
      .from(schema.roomAssignments)
      .leftJoin(
        schema.rooms,
        eq(schema.roomAssignments.room_id, schema.rooms.id),
      )
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.room_type_id, schema.roomTypes.id),
      )
      .leftJoin(
        schema.groupHotelStays,
        eq(
          schema.roomAssignments.group_hotel_stay_id,
          schema.groupHotelStays.id,
        ),
      )
      .leftJoin(
        schema.hotels,
        eq(schema.groupHotelStays.hotel_id, schema.hotels.id),
      )
      .leftJoin(
        schema.roomAssignmentStatuses,
        eq(
          schema.roomAssignments.room_assignment_status_id,
          schema.roomAssignmentStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.roomAssignments.group_membership_id, groupMembershipId),
          eq(schema.roomAssignments.is_active_assignment, true),
          eq(schema.roomAssignments.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.roomAssignments.assigned_at))
      .limit(1);

    if (!row) return null;

    return {
      id: row.room_assignments.id,
      room: row.rooms
        ? {
            id: row.rooms.id,
            room_number: row.rooms.room_number,
            room_type: row.room_types
              ? {
                  id: row.room_types.id,
                  code: row.room_types.type_code,
                  name: row.room_types.name,
                }
              : null,
          }
        : null,
      group_hotel_stay: row.group_hotel_stays
        ? {
            id: row.group_hotel_stays.id,
            stay_number: row.group_hotel_stays.stay_number,
            hotel: row.hotels
              ? {
                  id: row.hotels.id,
                  name: row.hotels.name,
                }
              : null,
          }
        : null,
      status: row.room_assignment_statuses
        ? {
            id: row.room_assignment_statuses.id,
            code: row.room_assignment_statuses.status_code,
            name: row.room_assignment_statuses.name,
          }
        : null,
    };
  }

  private async getInvoicesForRegistration(registrationId: string) {
    const rows = await this.db
      .select()
      .from(schema.invoices)
      .leftJoin(
        schema.invoiceStatuses,
        eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
      )
      .where(
        and(
          eq(schema.invoices.registration_id, registrationId),
          eq(schema.invoices.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.invoices.created_at));

    return rows.map((row) => ({
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
    }));
  }

  private async getCancellationInfo(registrationId: string) {
    const [row] = await this.db
      .select({
        cancellation_reason: schema.registrations.cancellation_reason,
        cancelled_at: schema.registrations.cancelled_at,
        cancelled_by: schema.registrations.cancelled_by,
      })
      .from(schema.registrations)
      .where(eq(schema.registrations.id, registrationId))
      .limit(1);

    if (!row) return null;

    return {
      cancellation_reason: row.cancellation_reason,
      cancelled_at: row.cancelled_at,
      cancelled_by: row.cancelled_by,
    };
  }
}
