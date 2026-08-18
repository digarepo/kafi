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
import {
  assertGroupAllowsAccommodationChange,
  resolveTravelGroupIdForStay,
  resolveTravelGroupIdForRoom,
} from './group-state-guard.js';

/**
 * Builds the active membership-stay key used by the DB unique constraint.
 */
function activeKey(membershipId: string, stayId: string): string {
  return `${membershipId}|${stayId}`;
}

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

      // Pessimistic lock: touch the room row to serialise concurrent inserts
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

      // Group-state guard
      await assertGroupAllowsAccommodationChange(
        tx,
        room.stay.travel_group_id,
        'create room assignment',
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
        active_membership_stay_key: activeKey(
          dto.group_membership_id,
          dto.group_hotel_stay_id,
        ),
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

    // Group-state guard
    const travelGroupId = await resolveTravelGroupIdForStay(
      this.db,
      assignment.group_hotel_stay_id,
    );
    await assertGroupAllowsAccommodationChange(
      this.db,
      travelGroupId,
      'release room assignment',
    );

    const releasedStatusId = await this.statusIdFor('RELEASED');

    await this.db
      .update(schema.roomAssignments)
      .set({
        room_assignment_status_id: releasedStatusId,
        released_at: new Date(),
        is_active_assignment: false,
        active_membership_stay_key: null,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.roomAssignments.id, id));

    return this.getAssignment(id);
  }

  /**
   * Atomically reassigns a member from their current room to a new room
   * within the same hotel stay. Releases the old assignment and creates
   * the new one in a single transaction.
   */
  async reassignAssignment(
    assignmentId: string,
    newRoomId: string,
    actorId: string,
  ) {
    let newAssignmentId = '';
    await this.db.transaction(async (tx) => {
      // Lock and fetch the existing assignment
      const [existing] = await tx
        .select()
        .from(schema.roomAssignments)
        .where(
          and(
            eq(schema.roomAssignments.id, assignmentId),
            eq(schema.roomAssignments.is_deleted, false),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundException('Room assignment not found');
      }
      if (!existing.is_active_assignment) {
        throw new ConflictException('Cannot reassign a released assignment');
      }

      const stayId = existing.group_hotel_stay_id;
      const membershipId = existing.group_membership_id;

      // Group-state guard
      await assertGroupAllowsAccommodationChange(
        tx,
        await resolveTravelGroupIdForStay(tx, stayId),
        'reassign room',
      );

      // Lock the new room
      const [roomForLock] = await tx
        .select({
          id: schema.rooms.id,
          capacity: schema.rooms.capacity,
          updated_at: schema.rooms.updated_at,
        })
        .from(schema.rooms)
        .where(
          and(
            eq(schema.rooms.id, newRoomId),
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

      const room = await this.roomWithStay(tx, newRoomId, stayId);
      const membership = await this.membershipWithTraveller(tx, membershipId);

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

      // Check capacity excluding the current assignment (which will be released)
      const activeCount = await this.activeAssignmentsInRoomExcluding(
        tx,
        room.room.id,
        assignmentId,
      );
      if (activeCount >= room.room.capacity) {
        throw new ConflictException('Room is at capacity');
      }

      // If moving to the same room, no-op
      if (existing.room_id === newRoomId) {
        throw new BadRequestException(
          'Traveller is already assigned to this room',
        );
      }

      // Release the old assignment
      const releasedStatusId = await this.statusIdFor('RELEASED', tx);
      await tx
        .update(schema.roomAssignments)
        .set({
          room_assignment_status_id: releasedStatusId,
          released_at: new Date(),
          is_active_assignment: false,
          active_membership_stay_key: null,
          updated_at: new Date(),
          updated_by: actorId,
        })
        .where(eq(schema.roomAssignments.id, assignmentId));

      // Create the new assignment
      const assignedStatusId = await this.statusIdFor('ASSIGNED', tx);
      newAssignmentId = ulid();
      await tx.insert(schema.roomAssignments).values({
        id: newAssignmentId,
        room_id: newRoomId,
        group_hotel_stay_id: stayId,
        group_membership_id: membershipId,
        assigned_at: new Date(),
        released_at: null,
        bed_number: null,
        room_assignment_status_id: assignedStatusId,
        is_active_assignment: true,
        active_membership_stay_key: activeKey(membershipId, stayId),
        notes: null,
        created_by: actorId,
        updated_by: actorId,
      });
    });

    return this.getAssignment(newAssignmentId);
  }

  /**
   * Releases all active room assignments for a given group membership.
   * Called when a membership is cancelled, transferred, or made inactive.
   */
  async releaseAssignmentsForMembership(
    membershipId: string,
    actorId: string,
    tx?: MySql2Database<typeof schema>,
  ): Promise<number> {
    const db = tx ?? this.db;
    const releasedStatusId = await this.statusIdFor('RELEASED', tx);

    const activeAssignments = await db
      .select({ id: schema.roomAssignments.id })
      .from(schema.roomAssignments)
      .where(
        and(
          eq(schema.roomAssignments.group_membership_id, membershipId),
          eq(schema.roomAssignments.is_active_assignment, true),
          eq(schema.roomAssignments.is_deleted, false),
        ),
      );

    if (activeAssignments.length === 0) return 0;

    await db
      .update(schema.roomAssignments)
      .set({
        room_assignment_status_id: releasedStatusId,
        released_at: new Date(),
        is_active_assignment: false,
        active_membership_stay_key: null,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(
        and(
          eq(schema.roomAssignments.group_membership_id, membershipId),
          eq(schema.roomAssignments.is_active_assignment, true),
          eq(schema.roomAssignments.is_deleted, false),
        ),
      );

    return activeAssignments.length;
  }

  /**
   * Auto-assigns all unassigned active members to available rooms in a stay.
   * Uses a transaction with row locking to prevent concurrent overbooking.
   * Respects room capacity, gender restrictions, and existing active
   * assignments. Returns the list of newly created assignments and any
   * members that could not be assigned.
   */
  async autoAssignForStay(stayId: string, actorId: string) {
    const result = { assigned: [] as any[], unassigned_members: [] as any[] };

    await this.db.transaction(async (tx) => {
      const stay = await this.findStay(stayId, tx);
      if (!stay) throw new NotFoundException('Group hotel stay not found');

      // Group-state guard
      await assertGroupAllowsAccommodationChange(
        tx,
        stay.travel_group_id,
        'auto-assign rooms',
      );

      // Lock all rooms for the stay by touching them
      const roomsForLock = await tx
        .select({
          id: schema.rooms.id,
          capacity: schema.rooms.capacity,
          updated_at: schema.rooms.updated_at,
        })
        .from(schema.rooms)
        .innerJoin(
          schema.roomStatuses,
          eq(schema.rooms.room_status_id, schema.roomStatuses.id),
        )
        .where(
          and(
            eq(schema.rooms.group_hotel_stay_id, stayId),
            eq(schema.rooms.is_deleted, false),
            eq(schema.roomStatuses.status_code, 'AVAILABLE'),
          ),
        )
        .orderBy(asc(schema.rooms.room_number));

      // Touch each room to acquire row locks
      for (const r of roomsForLock) {
        await tx
          .update(schema.rooms)
          .set({ capacity: r.capacity, updated_at: r.updated_at })
          .where(eq(schema.rooms.id, r.id));
      }

      // Re-query rooms with current active assignment counts (inside the lock)
      const rooms = await this.availableRoomsForStay(stayId, tx);
      const activeMembers = await this.activeMembersForGroup(
        stay.travel_group_id,
        tx,
      );
      const alreadyAssigned = await this.assignedMembershipIdsForStay(
        stayId,
        tx,
      );

      const unassigned = activeMembers.filter(
        (m) => !alreadyAssigned.has(m.id),
      );

      const roomCapacity = new Map<
        string,
        { room: any; current: number; max: number }
      >();
      for (const room of rooms) {
        roomCapacity.set(room.id, {
          room,
          current: room.active_assignment_count ?? 0,
          max: room.capacity,
        });
      }

      const assignedStatusId = await this.statusIdFor('ASSIGNED', tx);

      for (const member of unassigned) {
        let placed = false;
        for (const [, info] of roomCapacity) {
          if (info.current >= info.max) continue;

          if (info.room.gender_restriction) {
            if (member.traveller_gender !== info.room.gender_restriction) {
              continue;
            }
          }

          const id = ulid();
          await tx.insert(schema.roomAssignments).values({
            id,
            room_id: info.room.id,
            group_hotel_stay_id: stayId,
            group_membership_id: member.id,
            assigned_at: new Date(),
            released_at: null,
            bed_number: null,
            room_assignment_status_id: assignedStatusId,
            is_active_assignment: true,
            active_membership_stay_key: activeKey(member.id, stayId),
            notes: null,
            created_by: actorId,
            updated_by: actorId,
          });

          info.current++;
          result.assigned.push({
            id,
            group_membership_id: member.id,
            room_id: info.room.id,
            room_number: info.room.room_number,
          });
          placed = true;
          break;
        }

        if (!placed) {
          result.unassigned_members.push({
            group_membership_id: member.id,
            traveller_name: member.traveller_name,
            reason: 'No available room with capacity',
          });
        }
      }
    });

    return {
      assigned_count: result.assigned.length,
      unassigned_count: result.unassigned_members.length,
      assigned: result.assigned,
      unassigned_members: result.unassigned_members,
    };
  }

  private async findStay(
    stayId: string,
    db: MySql2Database<typeof schema> = this.db,
  ) {
    const [row] = await db
      .select()
      .from(schema.groupHotelStays)
      .where(
        and(
          eq(schema.groupHotelStays.id, stayId),
          eq(schema.groupHotelStays.is_deleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  private async availableRoomsForStay(
    stayId: string,
    db: MySql2Database<typeof schema> = this.db,
  ) {
    const rows = await db
      .select({
        id: schema.rooms.id,
        room_number: schema.rooms.room_number,
        capacity: schema.rooms.capacity,
        gender_restriction: schema.rooms.gender_restriction,
        room_status_code: schema.roomStatuses.status_code,
        active_assignment_count: sql<number>`(
          select count(*) from ${schema.roomAssignments}
          where ${schema.roomAssignments.room_id} = ${schema.rooms.id}
            and ${schema.roomAssignments.is_deleted} = false
            and ${schema.roomAssignments.is_active_assignment} = true
        )`,
      })
      .from(schema.rooms)
      .innerJoin(
        schema.roomStatuses,
        eq(schema.rooms.room_status_id, schema.roomStatuses.id),
      )
      .where(
        and(
          eq(schema.rooms.group_hotel_stay_id, stayId),
          eq(schema.rooms.is_deleted, false),
          eq(schema.roomStatuses.status_code, 'AVAILABLE'),
        ),
      )
      .orderBy(asc(schema.rooms.room_number));

    return rows;
  }

  private async activeMembersForGroup(
    travelGroupId: string,
    db: MySql2Database<typeof schema> = this.db,
  ) {
    const rows = await db
      .select({
        id: schema.groupMemberships.id,
        traveller_gender: schema.travellers.gender,
        traveller_name: sql<string>`concat_ws(' ', ${schema.travellers.first_name}, ${schema.travellers.last_name})`,
      })
      .from(schema.groupMemberships)
      .innerJoin(
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
          eq(schema.groupMemberships.travel_group_id, travelGroupId),
          eq(schema.groupMemberships.is_deleted, false),
          eq(schema.groupMembershipStatuses.status_code, 'ACTIVE'),
        ),
      )
      .orderBy(asc(schema.groupMemberships.joined_at));

    return rows;
  }

  private async assignedMembershipIdsForStay(
    stayId: string,
    db: MySql2Database<typeof schema> = this.db,
  ): Promise<Set<string>> {
    const rows = await db
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

  private async activeAssignmentsInRoomExcluding(
    db: MySql2Database<typeof schema>,
    roomId: string,
    excludeAssignmentId: string,
  ) {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.roomAssignments)
      .where(
        and(
          eq(schema.roomAssignments.room_id, roomId),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignments.is_active_assignment, true),
          sql`${schema.roomAssignments.id} != ${excludeAssignmentId}`,
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
