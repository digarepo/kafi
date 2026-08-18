import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { InvoicesService } from '../../../finance/application/services/invoices.service.js';
import { TravelGroupsService } from './travel-groups.service.js';

/**
 * Formats a Date as YYYY-MM-DD using the local timezone.
 * Avoids toISOString() which shifts the date back a day in timezones
 * behind UTC.
 */
function toDateStr(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface TravelGroupTraveller {
  id: string;
  registration_id: string;
  registration_number: string | null;
  registration_status: { id: string; code: string; name: string } | null;
  traveller: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    traveller_number: string;
    phone_number: string;
  } | null;
  membership_status: { id: string; code: string; name: string } | null;
  joined_at: Date | null;
  left_at: Date | null;
  guarantee_required: boolean;
  guarantee_waived: boolean;
  room_number: string | null;
}

/**
 * Read-only operational summary and traveller list for a travel group.
 *
 * Composes travel group, membership, hotel, transport, room, and finance
 * data without mutating any of them.
 */
@Injectable()
export class TravelGroupOperationalSummaryService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly travelGroups: TravelGroupsService,
    private readonly invoices: InvoicesService,
  ) {}

  async getOperationalSummary(travelGroupId: string) {
    // Auto-transition the group status based on departure/return dates
    // before building the summary. This replaces manual Depart/Complete
    // button clicks — the status updates automatically when the dates arrive.
    await this.travelGroups.autoTransitionByDates(travelGroupId);

    const group = await this.travelGroups.getTravelGroup(travelGroupId);
    if (!group) {
      throw new NotFoundException('Travel group not found');
    }

    const activeMemberRegIds = group.members
      .filter((m: any) => m.status_code === 'ACTIVE' && m.registration_id)
      .map((m: any) => m.registration_id);

    const [stays, segments, rooms, finance] = await Promise.all([
      this.getHotelStays(travelGroupId),
      this.getTransportSegments(travelGroupId),
      this.getRoomAssignments(travelGroupId),
      this.invoices.getRegistrationFinanceSummaries(activeMemberRegIds),
    ]);

    const members = group.members.map((m: any) => ({
      ...m,
      finance: finance.get(m.registration_id) ?? {
        total_invoiced: 0,
        total_paid: 0,
        total_unallocated: 0,
        outstanding_balance: 0,
      },
      room: rooms.find((r) => r.group_membership_id === m.id) ?? null,
    }));

    const totalInvoiced = members.reduce(
      (sum: number, m: any) => sum + (m.finance.total_invoiced ?? 0),
      0,
    );
    const totalPaid = members.reduce(
      (sum: number, m: any) => sum + (m.finance.total_paid ?? 0),
      0,
    );
    const totalOutstanding = members.reduce(
      (sum: number, m: any) => sum + (m.finance.outstanding_balance ?? 0),
      0,
    );

    const hasConfirmedHotelStay = stays.some(
      (s) => s.status?.code === 'CONFIRMED',
    );
    const hasConfirmedTransport = segments.some(
      (s) => s.status?.code === 'CONFIRMED',
    );
    const activeMembers = members.filter(
      (m: any) => m.status_code === 'ACTIVE',
    );
    const allMembersReady = activeMembers.every(
      (m: any) => m.registration_status_code === 'READY_FOR_TRAVEL',
    );

    // Multi-stay room coverage: every active member must have a room in EVERY
    // confirmed stay, not just one assignment somewhere.
    const confirmedStays = stays.filter((s) => s.status?.code === 'CONFIRMED');
    const activeMemberIds = new Set(activeMembers.map((m: any) => m.id));

    const stayCoverage = confirmedStays.map((stay) => {
      const assignedInStay = new Set(
        rooms
          .filter(
            (r) =>
              r.group_hotel_stay?.id === stay.id &&
              r.status?.code === 'ASSIGNED',
          )
          .map((r) => r.group_membership_id),
      );
      const assignedCount = [...assignedInStay].filter((id) =>
        activeMemberIds.has(id),
      ).length;
      const missingCount = activeMembers.length - assignedCount;
      return {
        stay_id: stay.id,
        stay_number: stay.stay_number,
        hotel_name: stay.hotel_name ?? stay.hotel?.name ?? null,
        city_name: stay.city?.name ?? null,
        sequence_order: stay.sequence_order,
        check_in_date: stay.check_in_date,
        check_out_date: stay.check_out_date,
        active_member_count: activeMembers.length,
        assigned_count: assignedCount,
        missing_count: missingCount,
        complete: missingCount === 0,
      };
    });

    const accommodationReady =
      confirmedStays.length > 0 && stayCoverage.every((c) => c.complete);

    const preparationBlockers: string[] = [];
    if (activeMembers.length === 0) {
      preparationBlockers.push('NO_ACTIVE_MEMBERS');
    }
    if (!allMembersReady) {
      preparationBlockers.push('MEMBERS_NOT_READY');
    }
    if (!hasConfirmedHotelStay) {
      preparationBlockers.push('HOTEL_NOT_CONFIRMED');
    }
    if (!accommodationReady) {
      preparationBlockers.push('ROOM_ASSIGNMENTS_INCOMPLETE');
    }

    // Transport is NOT a hard blocker for TRAVEL_PREPARED. It is tracked as
    // an informational warning so staff know it still needs to be arranged.
    const transportWarnings: string[] = [];
    if (!hasConfirmedTransport) {
      transportWarnings.push('TRANSPORT_NOT_RECORDED');
    }

    const canConfirmTravelPrepared =
      group.status_code === 'PLANNING' && preparationBlockers.length === 0;
    const readyToDepart =
      (group.status_code === 'PLANNING' ||
        group.status_code === 'TRAVEL_PREPARED') &&
      allMembersReady &&
      hasConfirmedHotelStay;

    return {
      ...group,
      logistics: {
        hotel_stays: stays,
        transport_segments: segments,
        room_assignments: rooms,
        has_confirmed_hotel_stay: hasConfirmedHotelStay,
        has_confirmed_transport: hasConfirmedTransport,
        rooms_assigned_count: rooms.length,
        stay_coverage: stayCoverage,
        accommodation_ready: accommodationReady,
      },
      financial_summary: {
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
      },
      members,
      departure_readiness: {
        all_members_ready: allMembersReady,
        can_depart: readyToDepart,
      },
      preparation_readiness: {
        can_confirm_travel_prepared: canConfirmTravelPrepared,
        blockers: preparationBlockers,
        transport_warnings: transportWarnings,
        active_member_count: activeMembers.length,
        ready_member_count: activeMembers.filter(
          (member: any) =>
            member.registration_status_code === 'READY_FOR_TRAVEL',
        ).length,
        room_assignments_complete: accommodationReady,
        assigned_room_count: rooms.filter((r) => r.status?.code === 'ASSIGNED')
          .length,
        stay_coverage: stayCoverage,
      },
    };
  }

  async getTravellers(travelGroupId: string): Promise<TravelGroupTraveller[]> {
    const group = await this.travelGroups.getTravelGroup(travelGroupId);
    if (!group) {
      throw new NotFoundException('Travel group not found');
    }

    const memberIds = group.members.map((m: any) => m.id);
    const rooms = await this.getRoomAssignments(travelGroupId);

    return group.members.map((m: any) => {
      const room = rooms.find((r) => r.group_membership_id === m.id);
      return {
        id: m.id,
        registration_id: m.registration_id,
        registration_number: m.registration_number,
        registration_status: m.registration_status,
        traveller: m.traveller
          ? {
              id: m.traveller.id,
              first_name: m.traveller.first_name,
              last_name: m.traveller.last_name,
              full_name:
                `${m.traveller.first_name} ${m.traveller.last_name}`.trim(),
              traveller_number: m.traveller.traveller_number ?? null,
              phone_number: m.traveller.phone_number ?? null,
            }
          : null,
        membership_status: m.status,
        joined_at: m.joined_at,
        left_at: m.left_at,
        guarantee_required: m.guarantee_required ?? false,
        guarantee_waived: m.guarantee_waived ?? false,
        room_number: room?.room_number ?? null,
      };
    });
  }

  private async getHotelStays(travelGroupId: string) {
    const rows = await this.db
      .select()
      .from(schema.groupHotelStays)
      .leftJoin(
        schema.travelGroups,
        eq(schema.groupHotelStays.travel_group_id, schema.travelGroups.id),
      )
      .leftJoin(
        schema.hotels,
        eq(schema.groupHotelStays.hotel_id, schema.hotels.id),
      )
      .leftJoin(
        schema.cities,
        eq(schema.groupHotelStays.city_id, schema.cities.id),
      )
      .leftJoin(
        schema.groupHotelStayStatuses,
        eq(
          schema.groupHotelStays.group_hotel_stay_status_id,
          schema.groupHotelStayStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.groupHotelStays.travel_group_id, travelGroupId),
          eq(schema.groupHotelStays.is_deleted, false),
        ),
      )
      .orderBy(
        asc(schema.groupHotelStays.sequence_order),
        asc(schema.groupHotelStays.check_in_date),
      );

    return rows.map((row) => ({
      id: row.group_hotel_stays.id,
      stay_number: row.group_hotel_stays.stay_number,
      check_in_date: toDateStr(row.group_hotel_stays.check_in_date),
      check_out_date: toDateStr(row.group_hotel_stays.check_out_date),
      hotel_id: row.group_hotel_stays.hotel_id,
      hotel_name: row.group_hotel_stays.hotel_name,
      booking_reference: row.group_hotel_stays.booking_reference,
      sequence_order: row.group_hotel_stays.sequence_order,
      notes: row.group_hotel_stays.notes,
      hotel: row.hotels
        ? {
            id: row.hotels.id,
            name: row.hotels.name,
          }
        : null,
      city: row.cities
        ? {
            id: row.cities.id,
            name: row.cities.name,
          }
        : null,
      status: row.group_hotel_stay_statuses
        ? {
            id: row.group_hotel_stay_statuses.id,
            code: row.group_hotel_stay_statuses.status_code,
            name: row.group_hotel_stay_statuses.name,
          }
        : null,
    }));
  }

  private async getTransportSegments(travelGroupId: string) {
    const rows = await this.db
      .select()
      .from(schema.transportSegments)
      .leftJoin(
        schema.travelGroups,
        eq(schema.transportSegments.travel_group_id, schema.travelGroups.id),
      )
      .leftJoin(
        schema.vendors,
        eq(schema.transportSegments.vendor_id, schema.vendors.id),
      )
      .leftJoin(
        schema.transportSegmentStatuses,
        eq(
          schema.transportSegments.transport_segment_status_id,
          schema.transportSegmentStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.transportSegments.travel_group_id, travelGroupId),
          eq(schema.transportSegments.is_deleted, false),
        ),
      )
      .orderBy(
        asc(schema.transportSegments.segment_order),
        asc(schema.transportSegments.departure_datetime),
      );

    return rows.map((row) => ({
      id: row.transport_segments.id,
      transport_segment_number: row.transport_segments.transport_segment_number,
      transport_type: row.transport_segments.transport_type,
      segment_order: row.transport_segments.segment_order,
      origin_location: row.transport_segments.origin_location,
      destination_location: row.transport_segments.destination_location,
      departure_datetime: row.transport_segments.departure_datetime,
      arrival_datetime: row.transport_segments.arrival_datetime,
      vehicle_identifier: row.transport_segments.vehicle_identifier,
      driver_name: row.transport_segments.driver_name,
      driver_phone_number: row.transport_segments.driver_phone_number,
      vendor: row.vendors
        ? {
            id: row.vendors.id,
            name: row.vendors.name,
          }
        : null,
      status: row.transport_segment_statuses
        ? {
            id: row.transport_segment_statuses.id,
            code: row.transport_segment_statuses.status_code,
            name: row.transport_segment_statuses.name,
          }
        : null,
    }));
  }

  private async getRoomAssignments(travelGroupId: string) {
    const rows = await this.db
      .select()
      .from(schema.roomAssignments)
      .innerJoin(
        schema.groupMemberships,
        eq(
          schema.roomAssignments.group_membership_id,
          schema.groupMemberships.id,
        ),
      )
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
          eq(schema.groupMemberships.travel_group_id, travelGroupId),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignments.is_active_assignment, true),
        ),
      )
      .orderBy(asc(schema.roomAssignments.assigned_at));

    return rows.map((row) => ({
      id: row.room_assignments.id,
      group_membership_id: row.room_assignments.group_membership_id,
      room_number: row.rooms?.room_number ?? null,
      room_type: row.room_types
        ? {
            id: row.room_types.id,
            code: row.room_types.type_code,
            name: row.room_types.name,
          }
        : null,
      hotel: row.hotels
        ? {
            id: row.hotels.id,
            name: row.hotels.name,
          }
        : null,
      group_hotel_stay: row.group_hotel_stays
        ? {
            id: row.group_hotel_stays.id,
            stay_number: row.group_hotel_stays.stay_number,
          }
        : null,
      status: row.room_assignment_statuses
        ? {
            id: row.room_assignment_statuses.id,
            code: row.room_assignment_statuses.status_code,
            name: row.room_assignment_statuses.name,
          }
        : null,
    }));
  }
}
