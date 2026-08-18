import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { BusinessNumberService } from './business-number.service.js';
import {
  CreateGroupHotelStayDto,
  GroupHotelStayFiltersDto,
  UpdateGroupHotelStayDto,
} from '../dto/operations.dto.js';
import { assertGroupAllowsAccommodationChange } from './group-state-guard.js';
import { ExpensesService } from '../../../finance/application/services/expenses.service.js';
import { ExpenseAdjustmentsService } from '../../../finance/application/services/expense-adjustments.service.js';

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

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

@Injectable()
export class GroupHotelStaysService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly expenses: ExpensesService,
    private readonly adjustments: ExpenseAdjustmentsService,
  ) {}

  async listStays(filters: GroupHotelStayFiltersDto) {
    const conditions = [eq(schema.groupHotelStays.is_deleted, false)];

    if (filters.travel_group_id) {
      conditions.push(
        eq(schema.groupHotelStays.travel_group_id, filters.travel_group_id),
      );
    }
    if (filters.hotel_id) {
      conditions.push(eq(schema.groupHotelStays.hotel_id, filters.hotel_id));
    }

    const [rows, count] = await Promise.all([
      this.db
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
        .where(and(...conditions)!)
        .orderBy(
          asc(schema.groupHotelStays.sequence_order),
          asc(schema.groupHotelStays.check_in_date),
        )
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.groupHotelStays)
        .where(eq(schema.groupHotelStays.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    const data = rows.map((row) => this.mapRow(row));

    return {
      data,
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getStay(id: string) {
    const [row] = await this.db
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
          eq(schema.groupHotelStays.id, id),
          eq(schema.groupHotelStays.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Group hotel stay not found');
    const rooms = await this.roomsForStay(id);
    return this.mapRow(row, rooms);
  }

  async createStay(dto: CreateGroupHotelStayDto, actorId: string) {
    const travelGroup = await this.findTravelGroup(dto.travel_group_id);
    if (!travelGroup) throw new NotFoundException('Travel group not found');

    // Group-state guard
    await assertGroupAllowsAccommodationChange(
      this.db,
      dto.travel_group_id,
      'create hotel stay',
    );

    if (dto.hotel_id) {
      const hotel = await this.findHotel(dto.hotel_id);
      if (!hotel) throw new NotFoundException('Hotel not found');
    }

    if (dto.check_in_date >= dto.check_out_date) {
      throw new BadRequestException('Check-out date must be after check-in');
    }

    await this.assertInTravelGroupDates(
      travelGroup.departure_date,
      travelGroup.return_date,
      dto.check_in_date,
      dto.check_out_date,
    );

    const sequenceOrder = await this.nextSequenceOrder(dto.travel_group_id);

    await this.assertChronologicalConsistency(
      dto.travel_group_id,
      dto.check_in_date,
      dto.check_out_date,
      sequenceOrder,
    );

    // Stays are always created as CONFIRMED — Kafi records a stay only after
    // the Saudi agency has provided confirmed accommodation information.
    // Accommodation cost is required — a confirmed stay is a financially
    // complete operational event.
    const accommodationCost = Number(dto.accommodation_cost ?? 0);
    if (!accommodationCost || accommodationCost <= 0) {
      throw new BadRequestException(
        'Accommodation cost is required to create a confirmed hotel stay',
      );
    }

    const statusId = await this.statusIdFor('CONFIRMED');
    const number = await this.numbers.generateStayNumber();

    const id = ulid();
    // Use a transaction so the hotel stay insert and the Finance expense
    // creation are atomic.
    await this.db.transaction(async (tx) => {
      await tx.insert(schema.groupHotelStays).values({
        id,
        stay_number: number,
        travel_group_id: dto.travel_group_id,
        hotel_id: dto.hotel_id ?? null,
        hotel_name: dto.hotel_name ?? null,
        booking_reference: dto.booking_reference ?? null,
        sequence_order: sequenceOrder,
        city_id: dto.city_id,
        check_in_date: toDateOrNull(dto.check_in_date)!,
        check_out_date: toDateOrNull(dto.check_out_date)!,
        group_hotel_stay_status_id: statusId,
        accommodation_cost: String(accommodationCost),
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });

      // Auto-create a Finance expense for the accommodation cost, linked
      // to the originating hotel stay. Group-scoped because accommodation
      // is a shared group expense.
      await this.expenses.createExpenseFromOperational(
        {
          expense_category_code: 'ACCOMMODATION',
          expense_source_code: 'GROUP_HOTEL_STAY',
          amount: accommodationCost,
          expense_date: new Date(dto.check_in_date),
          description: `Accommodation cost for ${number}`,
          attribution_scope: 'GROUP',
          travel_group_id: dto.travel_group_id,
          source_group_hotel_stay_id: id,
          actorId,
        },
        tx,
      );
    });

    return this.getStay(id);
  }

  async updateStay(id: string, dto: UpdateGroupHotelStayDto, actorId: string) {
    const existing = await this.getStay(id);
    const travelGroup = await this.findTravelGroup(existing.travel_group_id);

    // Group-state guard
    await assertGroupAllowsAccommodationChange(
      this.db,
      existing.travel_group_id,
      'update hotel stay',
    );

    const checkIn =
      toDateOrNull(dto.check_in_date) ?? toDateOrNull(existing.check_in_date);
    const checkOut =
      toDateOrNull(dto.check_out_date) ?? toDateOrNull(existing.check_out_date);

    if (checkIn && checkOut && checkIn >= checkOut) {
      throw new BadRequestException('Check-out date must be after check-in');
    }

    await this.assertInTravelGroupDates(
      travelGroup?.departure_date,
      travelGroup?.return_date,
      checkIn ? (toDateStr(checkIn) ?? undefined) : undefined,
      checkOut ? (toDateStr(checkOut) ?? undefined) : undefined,
    );

    if (checkIn && checkOut) {
      await this.assertChronologicalConsistency(
        existing.travel_group_id,
        toDateStr(checkIn) ?? '',
        toDateStr(checkOut) ?? '',
        existing.sequence_order,
        id,
      );
    }

    await this.db
      .update(schema.groupHotelStays)
      .set({
        ...(dto.hotel_id !== undefined && { hotel_id: dto.hotel_id ?? null }),
        ...(dto.hotel_name !== undefined && {
          hotel_name: dto.hotel_name ?? null,
        }),
        ...(dto.booking_reference !== undefined && {
          booking_reference: dto.booking_reference ?? null,
        }),
        ...(dto.city_id !== undefined && { city_id: dto.city_id }),
        ...(dto.check_in_date !== undefined && {
          check_in_date: toDateOrNull(dto.check_in_date)!,
        }),
        ...(dto.check_out_date !== undefined && {
          check_out_date: toDateOrNull(dto.check_out_date)!,
        }),
        ...(dto.group_hotel_stay_status_id !== undefined && {
          group_hotel_stay_status_id: dto.group_hotel_stay_status_id,
        }),
        ...(dto.accommodation_cost !== undefined && {
          accommodation_cost:
            dto.accommodation_cost !== null
              ? String(dto.accommodation_cost)
              : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.groupHotelStays.id, id));

    return this.getStay(id);
  }

  async deleteStay(id: string, actorId: string) {
    const existing = await this.getStay(id);

    // Group-state guard
    await assertGroupAllowsAccommodationChange(
      this.db,
      existing.travel_group_id,
      'delete hotel stay',
    );

    const rooms = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.rooms)
      .where(eq(schema.rooms.group_hotel_stay_id, id))
      .then((r) => r[0]?.count ?? 0);
    if (rooms > 0) {
      throw new ConflictException(
        'Group hotel stay has rooms; remove them first',
      );
    }

    // Hard delete: soft-deleted rows would block re-creation of stays due to
    // the unique constraint (travel_group_id, sequence_order).
    // The original Finance expense is NOT deleted — it remains as a
    // historical cost. Record an explicit adjustment for the supplier
    // refund (negative — recovery of accommodation cost).
    const accommodationCost = Number(existing.accommodation_cost ?? 0);
    await this.db
      .delete(schema.groupHotelStays)
      .where(eq(schema.groupHotelStays.id, id));

    if (accommodationCost > 0) {
      await this.recordDeletionAdjustment(
        id,
        existing,
        accommodationCost,
        'GROUP_HOTEL_STAY',
        'Hotel stay deleted — supplier refund',
        actorId,
      );
    }
  }

  /**
   * Returns the accommodation coverage for a travel group: for each confirmed
   * stay, how many active members have a room assignment and how many are
   * missing.
   */
  async getAccommodationCoverage(travelGroupId: string) {
    const stays = await this.confirmedStaysForGroup(travelGroupId);
    if (stays.length === 0) {
      return {
        stays: [],
        accommodation_ready: true,
        total_confirmed_stays: 0,
      };
    }

    const activeMembers = await this.activeMembersForGroup(travelGroupId);
    const activeMemberIds = new Set(activeMembers.map((m) => m.id));

    const coverage = [];
    for (const stay of stays) {
      const assignedIds = await this.assignedMembershipIdsForStay(stay.id);
      const assignedCount = [...assignedIds].filter((id) =>
        activeMemberIds.has(id),
      ).length;
      const missingCount = activeMembers.length - assignedCount;
      coverage.push({
        stay_id: stay.id,
        stay_number: stay.stay_number,
        hotel_name: stay.hotel_name,
        city_name: stay.city_name,
        check_in_date: toDateStr(stay.check_in_date),
        check_out_date: toDateStr(stay.check_out_date),
        sequence_order: stay.sequence_order,
        active_member_count: activeMembers.length,
        assigned_count: assignedCount,
        missing_count: missingCount,
        complete: missingCount === 0,
      });
    }

    return {
      stays: coverage,
      accommodation_ready: coverage.every((c) => c.complete),
      total_confirmed_stays: stays.length,
    };
  }

  /**
   * Records a SUPPLIER_REFUND adjustment when an operational record is
   * deleted. The original expense is preserved — only a negative
   * adjustment is recorded to reflect the cost recovery.
   */
  private async recordDeletionAdjustment(
    sourceRecordId: string,
    existing: any,
    costAmount: number,
    sourceRecordType: 'GROUP_HOTEL_STAY' | 'TRANSPORT_SEGMENT',
    reason: string,
    actorId: string,
  ) {
    const sourceColumn =
      sourceRecordType === 'GROUP_HOTEL_STAY'
        ? schema.expenses.source_group_hotel_stay_id
        : schema.expenses.source_transport_segment_id;

    const [expense] = await this.db
      .select({ id: schema.expenses.id })
      .from(schema.expenses)
      .where(
        and(
          eq(sourceColumn, sourceRecordId),
          eq(schema.expenses.is_deleted, false),
        ),
      )
      .limit(1);
    if (!expense) return;

    const adjustmentAmount = -Math.abs(costAmount);
    try {
      await this.adjustments.createAdjustment(
        {
          expense_id: expense.id,
          adjustment_type: 'SUPPLIER_REFUND',
          amount: adjustmentAmount,
          adjustment_date: new Date(),
          reason,
          source_record_type: sourceRecordType,
          source_record_id: sourceRecordId,
          source_record_number: existing.stay_number ?? existing.segment_number,
        } as any,
        actorId,
      );
    } catch {
      // Adjustment may already exist — acceptable.
    }
  }

  private async confirmedStaysForGroup(travelGroupId: string) {
    const rows = await this.db
      .select({
        id: schema.groupHotelStays.id,
        stay_number: schema.groupHotelStays.stay_number,
        hotel_name: schema.groupHotelStays.hotel_name,
        check_in_date: schema.groupHotelStays.check_in_date,
        check_out_date: schema.groupHotelStays.check_out_date,
        sequence_order: schema.groupHotelStays.sequence_order,
        city_name: schema.cities.name,
        status_code: schema.groupHotelStayStatuses.status_code,
      })
      .from(schema.groupHotelStays)
      .innerJoin(
        schema.groupHotelStayStatuses,
        eq(
          schema.groupHotelStays.group_hotel_stay_status_id,
          schema.groupHotelStayStatuses.id,
        ),
      )
      .leftJoin(
        schema.cities,
        eq(schema.groupHotelStays.city_id, schema.cities.id),
      )
      .where(
        and(
          eq(schema.groupHotelStays.travel_group_id, travelGroupId),
          eq(schema.groupHotelStays.is_deleted, false),
          eq(schema.groupHotelStayStatuses.status_code, 'CONFIRMED'),
        ),
      )
      .orderBy(asc(schema.groupHotelStays.sequence_order));

    return rows;
  }

  private async activeMembersForGroup(travelGroupId: string) {
    const rows = await this.db
      .select({
        id: schema.groupMemberships.id,
      })
      .from(schema.groupMemberships)
      .innerJoin(
        schema.groupMembershipStatuses,
        eq(
          schema.groupMemberships.group_membership_status_id,
          schema.groupMembershipStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.groupMemberships.travel_group_id, travelGroupId),
          eq(schema.groupMemberships.is_deleted, false),
          eq(schema.groupMembershipStatuses.status_code, 'ACTIVE'),
        ),
      );

    return rows;
  }

  private async assignedMembershipIdsForStay(
    stayId: string,
  ): Promise<Set<string>> {
    const rows = await this.db
      .select({
        membership_id: schema.roomAssignments.group_membership_id,
      })
      .from(schema.roomAssignments)
      .innerJoin(
        schema.roomAssignmentStatuses,
        eq(
          schema.roomAssignments.room_assignment_status_id,
          schema.roomAssignmentStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.roomAssignments.group_hotel_stay_id, stayId),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignments.is_active_assignment, true),
          eq(schema.roomAssignmentStatuses.status_code, 'ASSIGNED'),
        ),
      );

    return new Set(rows.map((r) => r.membership_id));
  }

  private async nextSequenceOrder(travelGroupId: string): Promise<number> {
    const [row] = await this.db
      .select({
        max: sql<number>`coalesce(max(${schema.groupHotelStays.sequence_order}), 0)`,
      })
      .from(schema.groupHotelStays)
      .where(
        and(
          eq(schema.groupHotelStays.travel_group_id, travelGroupId),
          eq(schema.groupHotelStays.is_deleted, false),
        ),
      );
    return (row?.max ?? 0) + 1;
  }

  /**
   * Validates chronological consistency: a later stay (higher sequence_order)
   * should not start before an earlier stay ends. Overlaps within the same
   * sequence are not checked here — the unique constraint on
   * (travel_group_id, sequence_order) prevents duplicate ordering.
   */
  private async assertChronologicalConsistency(
    travelGroupId: string,
    checkIn: string,
    checkOut: string,
    sequenceOrder: number,
    excludeStayId?: string,
  ) {
    const conditions = [
      eq(schema.groupHotelStays.travel_group_id, travelGroupId),
      eq(schema.groupHotelStays.is_deleted, false),
      sql`${schema.groupHotelStays.sequence_order} < ${sequenceOrder}`,
    ];
    if (excludeStayId) {
      conditions.push(sql`${schema.groupHotelStays.id} != ${excludeStayId}`);
    }

    const earlierStays = await this.db
      .select({
        check_out_date: schema.groupHotelStays.check_out_date,
        sequence_order: schema.groupHotelStays.sequence_order,
      })
      .from(schema.groupHotelStays)
      .where(and(...conditions))
      .orderBy(desc(schema.groupHotelStays.sequence_order))
      .limit(1);

    if (earlierStays.length > 0) {
      const prevCheckout = toDateStr(earlierStays[0].check_out_date);
      if (prevCheckout && checkIn < prevCheckout) {
        throw new BadRequestException(
          `Check-in date cannot be before the previous stay's check-out date (${prevCheckout})`,
        );
      }
    }
  }

  private async roomsForStay(stayId: string) {
    const rows = await this.db
      .select()
      .from(schema.rooms)
      .leftJoin(
        schema.roomTypes,
        eq(schema.rooms.room_type_id, schema.roomTypes.id),
      )
      .leftJoin(
        schema.roomStatuses,
        eq(schema.rooms.room_status_id, schema.roomStatuses.id),
      )
      .where(
        and(
          eq(schema.rooms.group_hotel_stay_id, stayId),
          eq(schema.rooms.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.rooms.room_number));

    return rows.map((row: any) => ({
      id: row.rooms.id,
      room_number: row.rooms.room_number,
      capacity: row.rooms.capacity,
      gender_restriction: row.rooms.gender_restriction,
      room_type_id: row.rooms.room_type_id,
      room_type: row.room_types
        ? {
            id: row.room_types.id,
            type_code: row.room_types.type_code,
            name: row.room_types.name,
          }
        : null,
      room_status_id: row.rooms.room_status_id,
      room_status: row.room_statuses
        ? {
            id: row.room_statuses.id,
            status_code: row.room_statuses.status_code,
            name: row.room_statuses.name,
          }
        : null,
      notes: row.rooms.notes,
      created_at: row.rooms.created_at,
      updated_at: row.rooms.updated_at,
      is_deleted: row.rooms.is_deleted,
    }));
  }

  private async statusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupHotelStayStatuses)
      .where(eq(schema.groupHotelStayStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new BadRequestException(
        `Group hotel stay status ${code} not found`,
      );
    return row.id;
  }

  private async findTravelGroup(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.travelGroups)
      .where(
        and(
          eq(schema.travelGroups.id, id),
          eq(schema.travelGroups.is_deleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  private async findHotel(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.hotels)
      .where(and(eq(schema.hotels.id, id), eq(schema.hotels.is_deleted, false)))
      .limit(1);
    return row;
  }

  private assertInTravelGroupDates(
    departure: Date | null,
    returnDate: Date | null,
    checkIn: string | undefined,
    checkOut: string | undefined,
  ) {
    if (!checkIn || !checkOut) return;
    const depStr = toDateStr(departure);
    if (depStr && checkIn < depStr) {
      throw new BadRequestException(
        'Check-in date cannot be before travel group departure',
      );
    }
    const retStr = toDateStr(returnDate);
    if (retStr && checkOut > retStr) {
      throw new BadRequestException(
        'Check-out date cannot be after travel group return',
      );
    }
  }

  private mapRow(row: any, rooms?: any[]) {
    const stay = row.group_hotel_stays;
    return {
      id: stay.id,
      stay_number: stay.stay_number,
      travel_group_id: stay.travel_group_id,
      travel_group: row.travel_groups
        ? { id: row.travel_groups.id, name: row.travel_groups.name }
        : null,
      hotel_id: stay.hotel_id,
      hotel_name: stay.hotel_name,
      hotel: row.hotels
        ? {
            id: row.hotels.id,
            hotel_code: row.hotels.hotel_code,
            name: row.hotels.name,
          }
        : null,
      booking_reference: stay.booking_reference,
      sequence_order: stay.sequence_order,
      city_id: stay.city_id,
      city: row.cities ? { id: row.cities.id, name: row.cities.name } : null,
      check_in_date: toDateStr(stay.check_in_date),
      check_out_date: toDateStr(stay.check_out_date),
      group_hotel_stay_status_id: stay.group_hotel_stay_status_id,
      accommodation_cost: stay.accommodation_cost ?? null,
      status: row.group_hotel_stay_statuses
        ? {
            id: row.group_hotel_stay_statuses.id,
            status_code: row.group_hotel_stay_statuses.status_code,
            name: row.group_hotel_stay_statuses.name,
          }
        : null,
      notes: stay.notes,
      rooms: rooms ?? null,
      created_at: stay.created_at,
      updated_at: stay.updated_at,
      is_deleted: stay.is_deleted,
    };
  }
}
