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

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

@Injectable()
export class GroupHotelStaysService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
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
        .orderBy(desc(schema.groupHotelStays.check_in_date))
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

    const hotel = await this.findHotel(dto.hotel_id);
    if (!hotel) throw new NotFoundException('Hotel not found');

    await this.assertInTravelGroupDates(
      travelGroup.departure_date,
      travelGroup.return_date,
      dto.check_in_date,
      dto.check_out_date,
    );

    if (dto.check_in_date >= dto.check_out_date) {
      throw new BadRequestException('Check-out date must be after check-in');
    }

    const statusId =
      dto.group_hotel_stay_status_id ?? (await this.statusIdFor('PLANNED'));
    const number = await this.numbers.generateStayNumber();

    const id = ulid();
    await this.db.insert(schema.groupHotelStays).values({
      id,
      stay_number: number,
      travel_group_id: dto.travel_group_id,
      hotel_id: dto.hotel_id,
      city_id: dto.city_id,
      check_in_date: toDateOrNull(dto.check_in_date)!,
      check_out_date: toDateOrNull(dto.check_out_date)!,
      group_hotel_stay_status_id: statusId,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getStay(id);
  }

  async updateStay(id: string, dto: UpdateGroupHotelStayDto, actorId: string) {
    const existing = await this.getStay(id);
    const travelGroup = await this.findTravelGroup(existing.travel_group_id);

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
      checkIn ? checkIn.toISOString().split('T')[0] : undefined,
      checkOut ? checkOut.toISOString().split('T')[0] : undefined,
    );

    await this.db
      .update(schema.groupHotelStays)
      .set({
        ...(dto.hotel_id !== undefined && { hotel_id: dto.hotel_id }),
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
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.groupHotelStays.id, id));

    return this.getStay(id);
  }

  async deleteStay(id: string, actorId: string) {
    await this.getStay(id);

    const rooms = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.rooms)
      .where(
        and(
          eq(schema.rooms.group_hotel_stay_id, id),
          eq(schema.rooms.is_deleted, false),
        ),
      )
      .then((r) => r[0]?.count ?? 0);
    if (rooms > 0) {
      throw new ConflictException(
        'Group hotel stay has rooms; remove them first',
      );
    }

    await this.db
      .update(schema.groupHotelStays)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.groupHotelStays.id, id));
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
    if (departure && checkIn < departure.toISOString().split('T')[0]) {
      throw new BadRequestException(
        'Check-in date cannot be before travel group departure',
      );
    }
    if (returnDate && checkOut > returnDate.toISOString().split('T')[0]) {
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
      hotel: row.hotels
        ? {
            id: row.hotels.id,
            hotel_code: row.hotels.hotel_code,
            name: row.hotels.name,
          }
        : null,
      city_id: stay.city_id,
      city: row.cities ? { id: row.cities.id, name: row.cities.name } : null,
      check_in_date: stay.check_in_date,
      check_out_date: stay.check_out_date,
      group_hotel_stay_status_id: stay.group_hotel_stay_status_id,
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
