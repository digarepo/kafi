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
  CreateRoomAssignmentDto,
  RoomAssignmentFiltersDto,
} from '../dto/operations.dto.js';

/**
 * Room occupancy assignment management.
 *
 * An assignment anchors to a group membership, which provides the
 * traveller identity and the authorisation to occupy a room in the travel
 * group.
 */
@Injectable()
export class RoomAssignmentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async listAssignments(filters: any) {
    const conditions = [eq(schema.roomAssignments.is_deleted, false)];

    if (filters.room_id) {
      conditions.push(eq(schema.roomAssignments.room_id, filters.room_id));
    }
    if (filters.group_hotel_stay_id) {
      conditions.push(
        eq(
          schema.roomAssignments.group_hotel_stay_id,
          filters.group_hotel_stay_id,
        ),
      );
    }
    if (filters.group_membership_id) {
      conditions.push(
        eq(
          schema.roomAssignments.group_membership_id,
          filters.group_membership_id,
        ),
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.roomAssignments)
        .leftJoin(
          schema.rooms,
          eq(schema.roomAssignments.room_id, schema.rooms.id),
        )
        .leftJoin(
          schema.roomAssignmentStatuses,
          eq(
            schema.roomAssignments.room_assignment_status_id,
            schema.roomAssignmentStatuses.id,
          ),
        )
        .leftJoin(
          schema.groupMemberships,
          eq(
            schema.roomAssignments.group_membership_id,
            schema.groupMemberships.id,
          ),
        )
        .leftJoin(
          schema.registrations,
          eq(schema.groupMemberships.registration_id, schema.registrations.id),
        )
        .leftJoin(
          schema.travellers,
          eq(schema.registrations.traveller_id, schema.travellers.id),
        )
        .where(and(...conditions)!)
        .orderBy(desc(schema.roomAssignments.assigned_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.roomAssignments)
        .where(eq(schema.roomAssignments.is_deleted, false))
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

  async getAssignment(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.roomAssignments)
      .leftJoin(
        schema.rooms,
        eq(schema.roomAssignments.room_id, schema.rooms.id),
      )
      .leftJoin(
        schema.roomAssignmentStatuses,
        eq(
          schema.roomAssignments.room_assignment_status_id,
          schema.roomAssignmentStatuses.id,
        ),
      )
      .leftJoin(
        schema.groupMemberships,
        eq(
          schema.roomAssignments.group_membership_id,
          schema.groupMemberships.id,
        ),
      )
      .leftJoin(
        schema.registrations,
        eq(schema.groupMemberships.registration_id, schema.registrations.id),
      )
      .leftJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .where(
        and(
          eq(schema.roomAssignments.id, id),
          eq(schema.roomAssignments.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Room assignment not found');
    return this.mapRow(row);
  }

  async createAssignment(dto: CreateRoomAssignmentDto, actorId: string) {
    let id = '';
    await this.db.transaction(async (tx) => {
      const [roomForLock] = await tx
        .select({
          id: schema.rooms.id,
          capacity: schema.rooms.capacity,
          updated_at: schema.rooms.updated_at,
        })
        .from(schema.rooms)
        .where(
          and(
            eq(schema.rooms.id, dto.room_id),
            eq(schema.rooms.is_deleted, false),
          ),
        )
        .limit(1);

      if (!roomForLock) throw new NotFoundException('Room not found');

      await tx
        .update(schema.rooms)
        .set({
          capacity: roomForLock.capacity,
          updated_at: roomForLock.updated_at,
        })
        .where(eq(schema.rooms.id, roomForLock.id));

      const room = await this.roomWithStay(
        tx,
        dto.room_id,
        dto.group_hotel_stay_id,
      );
      const membership = await this.membershipWithTraveller(
        tx,
        dto.group_membership_id,
      );

      if (room.status?.status_code !== 'AVAILABLE') {
        throw new BadRequestException('Room is not available');
      }
      if (membership.status?.status_code !== 'ACTIVE') {
        throw new BadRequestException('Group membership is not active');
      }

      if (
        room.stay.travel_group_id !==
        membership.group_membership.travel_group_id
      ) {
        throw new BadRequestException(
          'Group membership does not belong to the same travel group as the stay',
        );
      }

      if (room.room.gender_restriction) {
        if (membership.traveller.gender !== room.room.gender_restriction) {
          throw new BadRequestException(
            'Traveller gender does not match room gender restriction',
          );
        }
      }

      const activeCount = await this.activeAssignmentsInRoom(tx, room.room.id);
      if (activeCount >= room.room.capacity) {
        throw new ConflictException('Room is at capacity');
      }

      const alreadyActive = await this.activeAssignmentForMembership(
        tx,
        dto.group_membership_id,
        dto.group_hotel_stay_id,
      );
      if (alreadyActive) {
        throw new ConflictException(
          'Traveller already has an active assignment in this stay',
        );
      }

      const assignedStatusId = await this.statusIdFor('ASSIGNED', tx);

      id = ulid();
      await tx.insert(schema.roomAssignments).values({
        id,
        room_id: dto.room_id,
        group_hotel_stay_id: dto.group_hotel_stay_id,
        group_membership_id: dto.group_membership_id,
        assigned_at: new Date(),
        released_at: null,
        bed_number: dto.bed_number ?? null,
        room_assignment_status_id: assignedStatusId,
        is_active_assignment: true,
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });
    });

    return this.getAssignment(id);
  }

  async releaseAssignment(id: string, actorId: string) {
    const assignment = await this.getAssignment(id);
    if (!assignment.is_active_assignment) {
      throw new ConflictException('Assignment is already released');
    }

    const releasedStatusId = await this.statusIdFor('RELEASED');

    await this.db
      .update(schema.roomAssignments)
      .set({
        room_assignment_status_id: releasedStatusId,
        released_at: new Date(),
        is_active_assignment: false,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.roomAssignments.id, id));

    return this.getAssignment(id);
  }

  private async roomWithStay(
    db: MySql2Database<typeof schema>,
    roomId: string,
    stayId: string,
  ) {
    const [row] = await db
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
      .leftJoin(
        schema.groupHotelStays,
        eq(schema.rooms.group_hotel_stay_id, schema.groupHotelStays.id),
      )
      .where(
        and(
          eq(schema.rooms.id, roomId),
          eq(schema.rooms.is_deleted, false),
          eq(schema.rooms.group_hotel_stay_id, stayId),
        ),
      )
      .limit(1);

    if (!row || !row.group_hotel_stays) {
      throw new NotFoundException('Room not found in this stay');
    }
    return {
      room: row.rooms,
      type: row.room_types,
      status: row.room_statuses,
      stay: row.group_hotel_stays,
    };
  }

  private async membershipWithTraveller(
    db: MySql2Database<typeof schema>,
    membershipId: string,
  ) {
    const [row] = await db
      .select()
      .from(schema.groupMemberships)
      .leftJoin(
        schema.groupMembershipStatuses,
        eq(
          schema.groupMemberships.group_membership_status_id,
          schema.groupMembershipStatuses.id,
        ),
      )
      .leftJoin(
        schema.registrations,
        eq(schema.groupMemberships.registration_id, schema.registrations.id),
      )
      .leftJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .where(
        and(
          eq(schema.groupMemberships.id, membershipId),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Group membership not found');
    if (!row.travellers) throw new NotFoundException('Traveller not found');
    return {
      group_membership: row.group_memberships,
      status: row.group_membership_statuses,
      traveller: row.travellers,
    };
  }

  private async activeAssignmentsInRoom(
    db: MySql2Database<typeof schema>,
    roomId: string,
  ) {
    const [result] = await db
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

  private async activeAssignmentForMembership(
    db: MySql2Database<typeof schema>,
    membershipId: string,
    stayId: string,
  ) {
    const [row] = await db
      .select()
      .from(schema.roomAssignments)
      .where(
        and(
          eq(schema.roomAssignments.group_membership_id, membershipId),
          eq(schema.roomAssignments.group_hotel_stay_id, stayId),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignments.is_active_assignment, true),
        ),
      )
      .limit(1);
    return row;
  }

  private async statusIdFor(
    code: string,
    db: MySql2Database<typeof schema> = this.db,
  ) {
    const [row] = await db
      .select()
      .from(schema.roomAssignmentStatuses)
      .where(eq(schema.roomAssignmentStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new BadRequestException(`Room assignment status ${code} not found`);
    return row.id;
  }

  private mapRow(row: any) {
    const assignment = row.room_assignments;
    return {
      id: assignment.id,
      room_id: assignment.room_id,
      room: row.rooms
        ? {
            id: row.rooms.id,
            room_number: row.rooms.room_number,
            capacity: row.rooms.capacity,
            gender_restriction: row.rooms.gender_restriction,
          }
        : null,
      group_hotel_stay_id: assignment.group_hotel_stay_id,
      group_membership_id: assignment.group_membership_id,
      group_membership: row.group_memberships
        ? { id: row.group_memberships.id }
        : null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            gender: row.travellers.gender,
          }
        : null,
      assigned_at: assignment.assigned_at,
      released_at: assignment.released_at,
      bed_number: assignment.bed_number,
      room_assignment_status_id: assignment.room_assignment_status_id,
      status: row.room_assignment_statuses
        ? {
            id: row.room_assignment_statuses.id,
            status_code: row.room_assignment_statuses.status_code,
            name: row.room_assignment_statuses.name,
          }
        : null,
      is_active_assignment: assignment.is_active_assignment,
      notes: assignment.notes,
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
      is_deleted: assignment.is_deleted,
    };
  }
}
