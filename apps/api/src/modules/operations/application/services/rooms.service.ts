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
import {
  CreateRoomDto,
  RoomFiltersDto,
  UpdateRoomDto,
} from '../dto/operations.dto.js';
import {
  assertGroupAllowsAccommodationChange,
  resolveTravelGroupIdForStay,
  resolveTravelGroupIdForRoom,
} from './group-state-guard.js';

/**
 * Room inventory within a group hotel stay.
 */
@Injectable()
export class RoomsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async listRooms(filters: RoomFiltersDto) {
    const conditions = [eq(schema.rooms.is_deleted, false)];

    if (filters.group_hotel_stay_id) {
      conditions.push(
        eq(schema.rooms.group_hotel_stay_id, filters.group_hotel_stay_id),
      );
    }
    if (filters.status_id) {
      conditions.push(eq(schema.rooms.room_status_id, filters.status_id));
    }

    const [rows, count] = await Promise.all([
      this.db
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
        .where(and(...conditions)!)
        .orderBy(asc(schema.rooms.room_number))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.rooms)
        .where(eq(schema.rooms.is_deleted, false))
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

  async getRoom(id: string) {
    const [row] = await this.db
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
      .where(and(eq(schema.rooms.id, id), eq(schema.rooms.is_deleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException('Room not found');
    return this.mapRow(row);
  }

  async createRoom(dto: CreateRoomDto, actorId: string) {
    await this.assertRoomNumberUnique(dto.group_hotel_stay_id, dto.room_number);
    await this.getStay(dto.group_hotel_stay_id);

    // Group-state guard
    const travelGroupId = await resolveTravelGroupIdForStay(
      this.db,
      dto.group_hotel_stay_id,
    );
    await assertGroupAllowsAccommodationChange(
      this.db,
      travelGroupId,
      'create room',
    );

    const statusId =
      dto.room_status_id ?? (await this.statusIdFor('AVAILABLE'));

    const id = ulid();
    await this.db.insert(schema.rooms).values({
      id,
      room_code: null,
      group_hotel_stay_id: dto.group_hotel_stay_id,
      room_number: dto.room_number,
      capacity: dto.capacity,
      gender_restriction: dto.gender_restriction ?? null,
      room_type_id: dto.room_type_id ?? null,
      room_status_id: statusId,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getRoom(id);
  }

  async updateRoom(id: string, dto: UpdateRoomDto, actorId: string) {
    const existing = await this.getRoom(id);

    // Group-state guard
    const travelGroupId = await resolveTravelGroupIdForRoom(this.db, id);
    await assertGroupAllowsAccommodationChange(
      this.db,
      travelGroupId,
      'update room',
    );

    if (dto.room_number && dto.room_number !== existing.room_number) {
      await this.assertRoomNumberUnique(
        existing.group_hotel_stay_id,
        dto.room_number,
      );
    }

    if (dto.capacity !== undefined && dto.capacity < 1) {
      throw new BadRequestException('Room capacity must be at least 1');
    }

    if (dto.capacity !== undefined) {
      const activeCount = await this.activeAssignmentsInRoom(id);
      if (dto.capacity < activeCount) {
        throw new ConflictException(
          'Capacity cannot be lower than current active assignments',
        );
      }
    }

    await this.db
      .update(schema.rooms)
      .set({
        ...(dto.room_number !== undefined && {
          room_number: dto.room_number,
        }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.gender_restriction !== undefined && {
          gender_restriction: dto.gender_restriction ?? null,
        }),
        ...(dto.room_type_id !== undefined && {
          room_type_id: dto.room_type_id ?? null,
        }),
        ...(dto.room_status_id !== undefined && {
          room_status_id: dto.room_status_id,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.rooms.id, id));

    return this.getRoom(id);
  }

  async deleteRoom(id: string, actorId: string) {
    await this.getRoom(id);

    // Group-state guard
    const travelGroupId = await resolveTravelGroupIdForRoom(this.db, id);
    await assertGroupAllowsAccommodationChange(
      this.db,
      travelGroupId,
      'delete room',
    );

    const assigned = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.roomAssignments)
      .where(
        and(
          eq(schema.roomAssignments.room_id, id),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignments.is_active_assignment, true),
        ),
      )
      .then((r) => r[0]?.count ?? 0);
    if (assigned > 0) {
      throw new ConflictException('Room has active assignments');
    }

    // Hard delete: soft-deleted rows would block re-creation of the same
    // room number due to the unique constraint (group_hotel_stay_id, room_number).
    // Rooms are operational entities; audit trail is not required.
    await this.db.delete(schema.rooms).where(eq(schema.rooms.id, id));
  }

  private async getStay(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupHotelStays)
      .where(
        and(
          eq(schema.groupHotelStays.id, id),
          eq(schema.groupHotelStays.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Group hotel stay not found');
    return row;
  }

  private async statusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.roomStatuses)
      .where(eq(schema.roomStatuses.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Room status ${code} not found`);
    return row.id;
  }

  private async assertRoomNumberUnique(stayId: string, roomNumber: string) {
    const [row] = await this.db
      .select()
      .from(schema.rooms)
      .where(
        and(
          eq(schema.rooms.group_hotel_stay_id, stayId),
          eq(schema.rooms.room_number, roomNumber),
          eq(schema.rooms.is_deleted, false),
        ),
      )
      .limit(1);
    if (row) throw new ConflictException('Room number already exists in stay');
  }

  private async activeAssignmentsInRoom(roomId: string) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.roomAssignments)
      .where(
        and(
          eq(schema.roomAssignments.room_id, roomId),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignments.is_active_assignment, true),
        ),
      );
    return result?.count ?? 0;
  }

  private mapRow(row: any) {
    const room = row.rooms;
    return {
      id: room.id,
      room_code: room.room_code,
      group_hotel_stay_id: room.group_hotel_stay_id,
      room_number: room.room_number,
      capacity: room.capacity,
      gender_restriction: room.gender_restriction,
      room_type_id: room.room_type_id,
      room_type: row.room_types
        ? {
            id: row.room_types.id,
            type_code: row.room_types.type_code,
            name: row.room_types.name,
          }
        : null,
      room_status_id: room.room_status_id,
      room_status: row.room_statuses
        ? {
            id: row.room_statuses.id,
            status_code: row.room_statuses.status_code,
            name: row.room_statuses.name,
          }
        : null,
      notes: room.notes,
      created_at: room.created_at,
      updated_at: room.updated_at,
      is_deleted: room.is_deleted,
    };
  }
}
