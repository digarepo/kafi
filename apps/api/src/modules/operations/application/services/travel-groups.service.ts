import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, inArray, like, lte, or, sql } from 'drizzle-orm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { BusinessNumberService } from './business-number.service.js';
import { RoomAssignmentsService } from './room-assignments.service.js';
import {
  CreateTravelGroupDto,
  TravelGroupFiltersDto,
  UpdateTravelGroupDto,
} from '../dto/operations.dto.js';
import { createTravelGroupDepartedEvent } from '../../domain/events/travel-group-departed.event.js';
import { createTravelGroupCompletedEvent } from '../../domain/events/travel-group-completed.event.js';

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

interface TravelGroupListOperationalCounts {
  active_member_count: number;
  ready_member_count: number;
  has_confirmed_hotel_stay: boolean;
  has_confirmed_transport: boolean;
  assigned_room_count: number;
  preparation_ready: boolean;
}

/**
 * Travel group lifecycle and capacity management.
 *
 * The service owns `travel_groups` and only reads package versions, statuses,
 * and membership counts. It does not write to the packages or travellers
 * bounded contexts.
 */
@Injectable()
export class TravelGroupsService {
  private readonly logger = new Logger(TravelGroupsService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly eventEmitter: EventEmitter2,
    private readonly roomAssignments: RoomAssignmentsService,
  ) {}

  // ---- List / view ----

  async listTravelGroups(filters: TravelGroupFiltersDto) {
    const conditions = [eq(schema.travelGroups.is_deleted, false)];

    if (filters.package_version_id) {
      conditions.push(
        eq(schema.travelGroups.package_version_id, filters.package_version_id),
      );
    }
    if (filters.status_id) {
      conditions.push(
        eq(schema.travelGroups.travel_group_status_id, filters.status_id),
      );
    }
    if (filters.search) {
      const searchCondition = or(
        like(schema.travelGroups.name, `%${filters.search}%`),
        like(schema.travelGroups.group_number, `%${filters.search}%`),
      )!;
      if (searchCondition) conditions.push(searchCondition);
    }
    if (filters.departure_from) {
      conditions.push(
        sql`${schema.travelGroups.departure_date} >= ${filters.departure_from}`,
      );
    }
    if (filters.departure_to) {
      conditions.push(
        sql`${schema.travelGroups.departure_date} <= ${filters.departure_to}`,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.travelGroups)
        .leftJoin(
          schema.packageVersions,
          eq(schema.travelGroups.package_version_id, schema.packageVersions.id),
        )
        .leftJoin(
          schema.travelGroupStatuses,
          eq(
            schema.travelGroups.travel_group_status_id,
            schema.travelGroupStatuses.id,
          ),
        )
        .where(and(...conditions)!)
        .orderBy(desc(schema.travelGroups.created_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.travelGroups)
        .leftJoin(
          schema.packageVersions,
          eq(schema.travelGroups.package_version_id, schema.packageVersions.id),
        )
        .leftJoin(
          schema.travelGroupStatuses,
          eq(
            schema.travelGroups.travel_group_status_id,
            schema.travelGroupStatuses.id,
          ),
        )
        .where(and(...conditions)!)
        .then((r) => r[0]?.count ?? 0),
    ]);

    const operationalCounts = await this.listOperationalCounts(
      rows.map((row) => row.travel_groups.id),
    );
    const data = rows.map((row) =>
      this.mapListRow(row, operationalCounts.get(row.travel_groups.id)),
    );

    return {
      data,
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getTravelGroup(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.travelGroups)
      .leftJoin(
        schema.packageVersions,
        eq(schema.travelGroups.package_version_id, schema.packageVersions.id),
      )
      .leftJoin(
        schema.travelGroupStatuses,
        eq(
          schema.travelGroups.travel_group_status_id,
          schema.travelGroupStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travelGroups.id, id),
          eq(schema.travelGroups.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Travel group not found');
    const members = await this.membersForGroup(id);
    return this.mapDetailRow(row, members);
  }

  async listStatuses() {
    const rows = await this.db
      .select({
        id: schema.travelGroupStatuses.id,
        status_code: schema.travelGroupStatuses.status_code,
        name: schema.travelGroupStatuses.name,
      })
      .from(schema.travelGroupStatuses)
      .where(eq(schema.travelGroupStatuses.is_deleted, false))
      .orderBy(asc(schema.travelGroupStatuses.display_order));
    return rows;
  }

  // ---- Mutations ----

  async createTravelGroup(dto: CreateTravelGroupDto, actorId: string) {
    this.assertDateOrder(dto.departure_date, dto.return_date);

    const packageVersion = await this.findPackageVersion(
      dto.package_version_id,
    );
    if (!packageVersion)
      throw new NotFoundException('Package version not found');

    const statusId =
      dto.travel_group_status_id ?? (await this.statusIdFor('PLANNING'));

    const id = ulid();
    const number = await this.numbers.generateTravelGroupNumber();

    await this.db.insert(schema.travelGroups).values({
      id,
      group_number: number,
      package_version_id: dto.package_version_id,
      name: dto.name,
      departure_date: toDateOrNull(dto.departure_date),
      return_date: toDateOrNull(dto.return_date),
      maximum_capacity: dto.maximum_capacity,
      travel_group_status_id: statusId,
      remarks: dto.remarks ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getTravelGroup(id);
  }

  async updateTravelGroup(
    id: string,
    dto: UpdateTravelGroupDto,
    actorId: string,
  ) {
    const existing = await this.getTravelGroup(id);

    // Departure and return dates are derived from the package version and
    // must not be edited after the group leaves PLANNING. This prevents
    // date manipulation on prepared/departed/completed groups that would
    // corrupt auto-transition logic and historical records.
    if (
      existing.status_code !== 'PLANNING' &&
      (dto.departure_date !== undefined || dto.return_date !== undefined)
    ) {
      throw new ConflictException(
        'Travel dates cannot be edited after the group leaves PLANNING status',
      );
    }

    const departure = toDateOrNull(
      dto.departure_date ?? existing.departure_date,
    );
    const returnDate = toDateOrNull(dto.return_date ?? existing.return_date);
    this.assertDateOrder(
      departure ? departure.toISOString().split('T')[0] : undefined,
      returnDate ? returnDate.toISOString().split('T')[0] : undefined,
    );

    await this.db
      .update(schema.travelGroups)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.departure_date !== undefined && {
          departure_date: toDateOrNull(dto.departure_date),
        }),
        ...(dto.return_date !== undefined && {
          return_date: toDateOrNull(dto.return_date),
        }),
        ...(dto.maximum_capacity !== undefined && {
          maximum_capacity: dto.maximum_capacity,
        }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travelGroups.id, id));

    return this.getTravelGroup(id);
  }

  async deleteTravelGroup(id: string, actorId: string) {
    const group = await this.getTravelGroup(id);

    if (group.status_code !== 'PLANNING') {
      throw new ConflictException(
        'Travel group can only be deleted while in PLANNING status',
      );
    }

    const activeOrCompleted = group.members.some(
      (m: { status_code: string }) =>
        m.status_code === 'ACTIVE' || m.status_code === 'COMPLETED',
    );
    if (activeOrCompleted) {
      throw new ConflictException(
        'Travel group has active or completed memberships',
      );
    }

    await this.db
      .update(schema.travelGroups)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travelGroups.id, id));
  }

  /**
   * Cancels a travel group that has not yet departed.
   *
   * Allowed from PLANNING and TRAVEL_PREPARED only. A departed or completed
   * group cannot be cancelled — it must follow the normal lifecycle.
   *
   * Within a single transaction:
   * - All ACTIVE memberships are set to CANCELLED with left_at set.
   * - All active room assignments for those memberships are released.
   * - The travel group status is set to CANCELLED.
   *
   * The cancellation reason is stored in the group's remarks field.
   * The scheduler never calls this — cancellation is a manual, authorized
   * action only.
   */
  async cancelTravelGroup(
    id: string,
    reason: string | undefined,
    actorId: string,
  ) {
    const group = await this.getTravelGroup(id);

    if (!['PLANNING', 'TRAVEL_PREPARED'].includes(group.status_code)) {
      throw new ConflictException(
        `Cannot cancel a travel group in ${group.status_code} status`,
      );
    }

    const activeMembers = group.members.filter(
      (m: any) => m.status_code === 'ACTIVE',
    );
    const membershipIds = activeMembers.map((m: any) => m.id).filter(Boolean);

    const cancelledGroupStatusId = await this.statusIdFor('CANCELLED');
    const cancelledMembershipStatusId =
      await this.membershipStatusIdFor('CANCELLED');
    const activeMembershipStatusId = await this.membershipStatusIdFor('ACTIVE');
    const now = new Date();

    await this.db.transaction(async (tx) => {
      // Cancel all active memberships and release their room assignments.
      if (membershipIds.length > 0) {
        await tx
          .update(schema.groupMemberships)
          .set({
            group_membership_status_id: cancelledMembershipStatusId,
            left_at: now,
            updated_at: now,
            updated_by: actorId,
          })
          .where(
            and(
              inArray(schema.groupMemberships.id, membershipIds),
              eq(schema.groupMemberships.is_deleted, false),
              eq(
                schema.groupMemberships.group_membership_status_id,
                activeMembershipStatusId,
              ),
            ),
          );

        for (const membershipId of membershipIds) {
          await this.roomAssignments.releaseAssignmentsForMembership(
            membershipId,
            actorId,
            tx as unknown as MySql2Database<typeof schema>,
          );
        }
      }

      // Set the group to CANCELLED.
      await tx
        .update(schema.travelGroups)
        .set({
          travel_group_status_id: cancelledGroupStatusId,
          remarks: reason ?? group.remarks ?? null,
          updated_at: now,
          updated_by: actorId,
        })
        .where(eq(schema.travelGroups.id, id));
    });

    return this.getTravelGroup(id);
  }

  async confirmTravelPrepared(id: string, actorId: string) {
    const group = await this.getTravelGroup(id);
    if (group.status_code !== 'PLANNING') {
      throw new ConflictException(
        `Cannot confirm travel prepared from ${group.status_code}`,
      );
    }

    const activeMembers = group.members.filter(
      (m: any) => m.status_code === 'ACTIVE',
    );
    if (activeMembers.length === 0) {
      throw new ConflictException(
        'Travel group must have at least one active member',
      );
    }

    for (const m of activeMembers) {
      if (m.registration_status_code !== 'READY_FOR_TRAVEL') {
        throw new ConflictException(
          'All active members must be READY_FOR_TRAVEL',
        );
      }
    }

    const confirmedHotel = await this.hasConfirmedHotelStay(id);
    if (!confirmedHotel) {
      throw new ConflictException('A confirmed group hotel stay is required');
    }

    // Transport is NOT a hard blocker for TRAVEL_PREPARED. It remains visible
    // as an informational/warning item in the preparation summary so staff
    // know it still needs to be arranged, but it does not prevent the group
    // from being marked travel-prepared.

    // Every active member must have a room assignment in EVERY confirmed stay.
    const confirmedStayIds = await this.confirmedStayIdsForGroup(id);
    for (const stayId of confirmedStayIds) {
      for (const m of activeMembers) {
        const assigned = await this.hasActiveRoomAssignmentForStay(
          m.id,
          stayId,
        );
        if (!assigned) {
          throw new ConflictException(
            `Active member ${m.id} does not have an assigned room in stay ${stayId}`,
          );
        }
      }
    }

    const statusId = await this.statusIdFor('TRAVEL_PREPARED');
    await this.db
      .update(schema.travelGroups)
      .set({
        travel_group_status_id: statusId,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travelGroups.id, id));

    return this.getTravelGroup(id);
  }

  async depart(id: string, actorId: string) {
    const group = await this.getTravelGroup(id);
    if (group.status_code !== 'TRAVEL_PREPARED') {
      throw new ConflictException(`Cannot depart from ${group.status_code}`);
    }

    const activeMembers = group.members.filter(
      (m: any) => m.status_code === 'ACTIVE',
    );
    for (const m of activeMembers) {
      if (m.registration_status_code !== 'READY_FOR_TRAVEL') {
        throw new ConflictException(
          'All active members must be READY_FOR_TRAVEL',
        );
      }
    }

    const statusId = await this.statusIdFor('DEPARTED');
    const now = new Date();
    await this.db
      .update(schema.travelGroups)
      .set({
        travel_group_status_id: statusId,
        updated_at: now,
        updated_by: actorId,
      })
      .where(eq(schema.travelGroups.id, id));

    const event = createTravelGroupDepartedEvent({
      travel_group_id: id,
      group_number: group.group_number,
      departed_at: now.toISOString(),
    });
    this.eventEmitter.emit(event.type, event);

    return this.getTravelGroup(id);
  }

  async complete(id: string, actorId: string) {
    const group = await this.getTravelGroup(id);
    if (group.status_code !== 'DEPARTED') {
      throw new ConflictException(`Cannot complete from ${group.status_code}`);
    }

    const activeMembers = group.members.filter(
      (m: any) => m.status_code === 'ACTIVE',
    );
    for (const m of activeMembers) {
      if (m.registration_status_code !== 'READY_FOR_TRAVEL') {
        throw new ConflictException(
          'All active members must be READY_FOR_TRAVEL',
        );
      }
    }

    const registrationIds = activeMembers
      .map((m: any) => m.registration_id)
      .filter(Boolean);

    const completedGroupStatusId = await this.statusIdFor('COMPLETED');
    const completedRegistrationStatusId =
      await this.registrationStatusIdFor('COMPLETED');
    const completedMembershipStatusId =
      await this.membershipStatusIdFor('COMPLETED');
    const readyForTravelStatusId =
      await this.registrationStatusIdFor('READY_FOR_TRAVEL');
    const activeMembershipStatusId = await this.membershipStatusIdFor('ACTIVE');
    const now = new Date();

    const membershipIds = activeMembers.map((m: any) => m.id).filter(Boolean);

    await this.db.transaction(async (tx) => {
      if (registrationIds.length > 0) {
        const stillReady = await tx
          .select({ id: schema.registrations.id })
          .from(schema.registrations)
          .where(
            and(
              inArray(schema.registrations.id, registrationIds),
              eq(schema.registrations.is_deleted, false),
              eq(
                schema.registrations.registration_status_id,
                readyForTravelStatusId,
              ),
            ),
          );

        if (stillReady.length !== registrationIds.length) {
          throw new ConflictException(
            'One or more member registrations are no longer READY_FOR_TRAVEL; completion aborted',
          );
        }
      }

      await tx
        .update(schema.travelGroups)
        .set({
          travel_group_status_id: completedGroupStatusId,
          updated_at: now,
          updated_by: actorId,
        })
        .where(eq(schema.travelGroups.id, id));

      if (registrationIds.length > 0) {
        await tx
          .update(schema.registrations)
          .set({
            registration_status_id: completedRegistrationStatusId,
            updated_at: now,
            updated_by: actorId,
          })
          .where(
            and(
              inArray(schema.registrations.id, registrationIds),
              eq(schema.registrations.is_deleted, false),
              eq(
                schema.registrations.registration_status_id,
                readyForTravelStatusId,
              ),
            ),
          );
      }

      // Complete all active memberships so they don't remain ACTIVE
      // on a COMPLETED group. This keeps group, registrations, and
      // memberships transactionally consistent.
      if (membershipIds.length > 0) {
        await tx
          .update(schema.groupMemberships)
          .set({
            group_membership_status_id: completedMembershipStatusId,
            left_at: now,
            updated_at: now,
            updated_by: actorId,
          })
          .where(
            and(
              inArray(schema.groupMemberships.id, membershipIds),
              eq(schema.groupMemberships.is_deleted, false),
              eq(
                schema.groupMemberships.group_membership_status_id,
                activeMembershipStatusId,
              ),
            ),
          );

        // Release all active room assignments for each completed membership.
        // This prevents orphaned assignments that would inflate room occupancy.
        for (const membershipId of membershipIds) {
          await this.roomAssignments.releaseAssignmentsForMembership(
            membershipId,
            actorId,
            tx as unknown as MySql2Database<typeof schema>,
          );
        }
      }
    });

    const event = createTravelGroupCompletedEvent({
      travel_group_id: id,
      group_number: group.group_number,
      completed_at: now.toISOString(),
      registration_ids: registrationIds,
    });
    this.eventEmitter.emit(event.type, event);

    return this.getTravelGroup(id);
  }

  /**
   * Automatically transitions the travel group status based on the
   * departure and return dates.
   *
   * - TRAVEL_PREPARED → DEPARTED when today >= departure_date
   * - DEPARTED → COMPLETED when today >= return_date
   *
   * This replaces the manual "Depart" and "Complete" button clicks.
   * The transition only fires if the group's preparation requirements
   * are still satisfied (members READY_FOR_TRAVEL, etc.).
   *
   * Errors are caught and logged so that an incomplete group does not
   * break the operational summary endpoint. The tick endpoint collects
   * warnings for groups that fail to transition.
   */
  async autoTransitionByDates(id: string): Promise<void> {
    try {
      const group = await this.getTravelGroup(id);

      if (group.status_code === 'TRAVEL_PREPARED' && group.departure_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const departure = new Date(group.departure_date);
        departure.setHours(0, 0, 0, 0);

        if (today >= departure) {
          await this.depart(id, 'SYSTEM');
        }
      }

      // Re-fetch in case we just transitioned to DEPARTED
      const updated = await this.getTravelGroup(id);
      if (updated.status_code === 'DEPARTED' && updated.return_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const returnDate = new Date(updated.return_date);
        returnDate.setHours(0, 0, 0, 0);

        if (today >= returnDate) {
          await this.complete(id, 'SYSTEM');
        }
      }
    } catch (err) {
      // Log the error so operators can see which groups failed to
      // auto-transition and why. The error is not re-thrown so the
      // operational summary endpoint remains usable.
      this.logger.warn(
        `Auto-transition failed for travel group ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Finds all travel groups that are due for an automatic status transition
   * based on their departure/return dates.
   *
   * Used by the internal workflow tick endpoint (called by EasyCron).
   *
   * - TRAVEL_PREPARED groups with departure_date <= today
   * - DEPARTED groups with return_date <= today
   *
   * Returns the IDs grouped by the transition that should occur.
   */
  async findGroupsDueForTransition(): Promise<{
    due_departure: { id: string; group_number: string }[];
    due_completion: { id: string; group_number: string }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    const travelPreparedStatusId = await this.statusIdFor('TRAVEL_PREPARED');
    const departedStatusId = await this.statusIdFor('DEPARTED');

    const dueDeparture = await this.db
      .select({
        id: schema.travelGroups.id,
        group_number: schema.travelGroups.group_number,
      })
      .from(schema.travelGroups)
      .where(
        and(
          eq(
            schema.travelGroups.travel_group_status_id,
            travelPreparedStatusId,
          ),
          eq(schema.travelGroups.is_deleted, false),
          lte(sql`DATE(${schema.travelGroups.departure_date})`, todayStr),
        ),
      );

    const dueCompletion = await this.db
      .select({
        id: schema.travelGroups.id,
        group_number: schema.travelGroups.group_number,
      })
      .from(schema.travelGroups)
      .where(
        and(
          eq(schema.travelGroups.travel_group_status_id, departedStatusId),
          eq(schema.travelGroups.is_deleted, false),
          lte(sql`DATE(${schema.travelGroups.return_date})`, todayStr),
        ),
      );

    return {
      due_departure: dueDeparture,
      due_completion: dueCompletion,
    };
  }

  /**
   * Processes all due travel-group transitions in a single tick.
   *
   * Called by the internal workflow tick endpoint. Each group is processed
   * independently — a failure for one group does not abort the batch.
   * Returns a summary of what was transitioned and what failed.
   */
  async processScheduledTransitions(): Promise<{
    departed: { id: string; group_number: string }[];
    completed: { id: string; group_number: string }[];
    warnings: { id: string; group_number: string; reason: string }[];
  }> {
    const { due_departure, due_completion } =
      await this.findGroupsDueForTransition();

    const departed: { id: string; group_number: string }[] = [];
    const completed: { id: string; group_number: string }[] = [];
    const warnings: { id: string; group_number: string; reason: string }[] = [];

    for (const group of due_departure) {
      try {
        await this.depart(group.id, 'SYSTEM');
        departed.push(group);
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Departure failed';
        this.logger.warn(
          `Scheduled departure failed for ${group.group_number} (${group.id}): ${reason}`,
        );
        warnings.push({
          id: group.id,
          group_number: group.group_number,
          reason,
        });
      }
    }

    for (const group of due_completion) {
      try {
        await this.complete(group.id, 'SYSTEM');
        completed.push(group);
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Completion failed';
        this.logger.warn(
          `Scheduled completion failed for ${group.group_number} (${group.id}): ${reason}`,
        );
        warnings.push({
          id: group.id,
          group_number: group.group_number,
          reason,
        });
      }
    }

    return { departed, completed, warnings };
  }

  // ---- Helpers ----

  private async membersForGroup(groupId: string) {
    const rows = await this.db
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
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .leftJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .where(
        and(
          eq(schema.groupMemberships.travel_group_id, groupId),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.groupMemberships.joined_at));

    return rows.map((row: any) => ({
      id: row.group_memberships.id,
      travel_group_id: row.group_memberships.travel_group_id,
      registration_id: row.group_memberships.registration_id,
      registration_number: row.registrations?.registration_number ?? null,
      registration_status: row.registration_statuses
        ? {
            id: row.registration_statuses.id,
            status_code: row.registration_statuses.status_code,
            name: row.registration_statuses.name,
          }
        : null,
      registration_status_code: row.registration_statuses?.status_code ?? null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
          }
        : null,
      status: row.group_membership_statuses
        ? {
            id: row.group_membership_statuses.id,
            status_code: row.group_membership_statuses.status_code,
            name: row.group_membership_statuses.name,
          }
        : null,
      status_code: row.group_membership_statuses?.status_code ?? null,
      joined_at: row.group_memberships.joined_at,
      left_at: row.group_memberships.left_at,
      transferred_from_group_membership_id:
        row.group_memberships.transferred_from_group_membership_id,
      guarantee_required: row.group_memberships.guarantee_required,
      guarantee_waived: row.group_memberships.guarantee_waived,
      remarks: row.group_memberships.remarks,
    }));
  }

  private async activeMembershipStatus() {
    const [row] = await this.db
      .select()
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.status_code, 'ACTIVE'))
      .limit(1);
    if (!row)
      throw new BadRequestException('ACTIVE membership status not found');
    return row;
  }

  private async statusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.travelGroupStatuses)
      .where(eq(schema.travelGroupStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new NotFoundException(`Travel group status ${code} not found`);
    return row.id;
  }

  private async registrationStatusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrationStatuses)
      .where(eq(schema.registrationStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new NotFoundException(`Registration status ${code} not found`);
    return row.id;
  }

  private async membershipStatusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new NotFoundException(`Membership status ${code} not found`);
    return row.id;
  }

  private async hasConfirmedHotelStay(groupId: string) {
    const [row] = await this.db
      .select({ id: schema.groupHotelStays.id })
      .from(schema.groupHotelStays)
      .innerJoin(
        schema.groupHotelStayStatuses,
        eq(
          schema.groupHotelStays.group_hotel_stay_status_id,
          schema.groupHotelStayStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.groupHotelStays.travel_group_id, groupId),
          eq(schema.groupHotelStays.is_deleted, false),
          eq(schema.groupHotelStayStatuses.status_code, 'CONFIRMED'),
        ),
      )
      .limit(1);
    return !!row;
  }

  private async confirmedStayIdsForGroup(groupId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.groupHotelStays.id })
      .from(schema.groupHotelStays)
      .innerJoin(
        schema.groupHotelStayStatuses,
        eq(
          schema.groupHotelStays.group_hotel_stay_status_id,
          schema.groupHotelStayStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.groupHotelStays.travel_group_id, groupId),
          eq(schema.groupHotelStays.is_deleted, false),
          eq(schema.groupHotelStayStatuses.status_code, 'CONFIRMED'),
        ),
      );
    return rows.map((r) => r.id);
  }

  private async hasActiveRoomAssignmentForStay(
    groupMembershipId: string,
    stayId: string,
  ) {
    const [row] = await this.db
      .select({ id: schema.roomAssignments.id })
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
          eq(schema.roomAssignments.group_membership_id, groupMembershipId),
          eq(schema.roomAssignments.group_hotel_stay_id, stayId),
          eq(schema.roomAssignments.is_active_assignment, true),
          eq(schema.roomAssignments.is_deleted, false),
          eq(schema.roomAssignmentStatuses.status_code, 'ASSIGNED'),
        ),
      )
      .limit(1);
    return !!row;
  }

  private async hasConfirmedTransportSegment(groupId: string) {
    const [row] = await this.db
      .select({ id: schema.transportSegments.id })
      .from(schema.transportSegments)
      .innerJoin(
        schema.transportSegmentStatuses,
        eq(
          schema.transportSegments.transport_segment_status_id,
          schema.transportSegmentStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.transportSegments.travel_group_id, groupId),
          eq(schema.transportSegments.is_deleted, false),
          eq(schema.transportSegmentStatuses.status_code, 'CONFIRMED'),
        ),
      )
      .limit(1);
    return !!row;
  }

  private async getTravelGroupStatus(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.travelGroupStatuses)
      .where(eq(schema.travelGroupStatuses.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Travel group status not found');
    return row;
  }

  private async findPackageVersion(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.packageVersions)
      .where(
        and(
          eq(schema.packageVersions.id, id),
          eq(schema.packageVersions.is_deleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  private assertDateOrder(
    departure: string | undefined | null,
    returnDate: string | undefined | null,
  ) {
    if (departure && returnDate && departure > returnDate) {
      throw new BadRequestException(
        'Departure date cannot be after return date',
      );
    }
  }

  private async listOperationalCounts(groupIds: string[]) {
    const result = new Map<string, TravelGroupListOperationalCounts>();
    if (groupIds.length === 0) return result;

    const [membershipRows, hotelRows, transportRows, roomRows] =
      await Promise.all([
        this.db
          .select({
            travel_group_id: schema.groupMemberships.travel_group_id,
            membership_status: schema.groupMembershipStatuses.status_code,
            registration_status: schema.registrationStatuses.status_code,
          })
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
            eq(
              schema.groupMemberships.registration_id,
              schema.registrations.id,
            ),
          )
          .leftJoin(
            schema.registrationStatuses,
            eq(
              schema.registrations.registration_status_id,
              schema.registrationStatuses.id,
            ),
          )
          .where(
            and(
              inArray(schema.groupMemberships.travel_group_id, groupIds),
              eq(schema.groupMemberships.is_deleted, false),
            ),
          ),
        this.db
          .select({ travel_group_id: schema.groupHotelStays.travel_group_id })
          .from(schema.groupHotelStays)
          .innerJoin(
            schema.groupHotelStayStatuses,
            eq(
              schema.groupHotelStays.group_hotel_stay_status_id,
              schema.groupHotelStayStatuses.id,
            ),
          )
          .where(
            and(
              inArray(schema.groupHotelStays.travel_group_id, groupIds),
              eq(schema.groupHotelStays.is_deleted, false),
              eq(schema.groupHotelStayStatuses.status_code, 'CONFIRMED'),
            ),
          ),
        this.db
          .select({ travel_group_id: schema.transportSegments.travel_group_id })
          .from(schema.transportSegments)
          .innerJoin(
            schema.transportSegmentStatuses,
            eq(
              schema.transportSegments.transport_segment_status_id,
              schema.transportSegmentStatuses.id,
            ),
          )
          .where(
            and(
              inArray(schema.transportSegments.travel_group_id, groupIds),
              eq(schema.transportSegments.is_deleted, false),
              eq(schema.transportSegmentStatuses.status_code, 'CONFIRMED'),
            ),
          ),
        this.db
          .select({ travel_group_id: schema.groupMemberships.travel_group_id })
          .from(schema.roomAssignments)
          .innerJoin(
            schema.groupMemberships,
            eq(
              schema.roomAssignments.group_membership_id,
              schema.groupMemberships.id,
            ),
          )
          .innerJoin(
            schema.roomAssignmentStatuses,
            eq(
              schema.roomAssignments.room_assignment_status_id,
              schema.roomAssignmentStatuses.id,
            ),
          )
          .innerJoin(
            schema.groupMembershipStatuses,
            eq(
              schema.groupMemberships.group_membership_status_id,
              schema.groupMembershipStatuses.id,
            ),
          )
          .where(
            and(
              inArray(schema.groupMemberships.travel_group_id, groupIds),
              eq(schema.roomAssignments.is_deleted, false),
              eq(schema.roomAssignments.is_active_assignment, true),
              eq(schema.roomAssignmentStatuses.status_code, 'ASSIGNED'),
              eq(schema.groupMembershipStatuses.status_code, 'ACTIVE'),
            ),
          ),
      ]);

    for (const groupId of groupIds) {
      const memberships = membershipRows.filter(
        (row) => row.travel_group_id === groupId,
      );
      const activeMemberCount = memberships.filter(
        (row) => row.membership_status === 'ACTIVE',
      ).length;
      const readyMemberCount = memberships.filter(
        (row) =>
          row.membership_status === 'ACTIVE' &&
          row.registration_status === 'READY_FOR_TRAVEL',
      ).length;
      const hasConfirmedHotelStay = hotelRows.some(
        (row) => row.travel_group_id === groupId,
      );
      const hasConfirmedTransport = transportRows.some(
        (row) => row.travel_group_id === groupId,
      );
      const assignedRoomCount = roomRows.filter(
        (row) => row.travel_group_id === groupId,
      ).length;

      result.set(groupId, {
        active_member_count: activeMemberCount,
        ready_member_count: readyMemberCount,
        has_confirmed_hotel_stay: hasConfirmedHotelStay,
        has_confirmed_transport: hasConfirmedTransport,
        assigned_room_count: assignedRoomCount,
        preparation_ready:
          activeMemberCount > 0 &&
          readyMemberCount === activeMemberCount &&
          hasConfirmedHotelStay &&
          assignedRoomCount >= activeMemberCount,
      });
    }

    // Note: The list-level preparation_ready flag is a quick approximation.
    // The authoritative multi-stay room coverage check is performed by the
    // operational summary service and confirmTravelPrepared.

    return result;
  }

  private mapListRow(row: any, operational?: TravelGroupListOperationalCounts) {
    const group = row.travel_groups;
    const counts = operational ?? {
      active_member_count: 0,
      ready_member_count: 0,
      has_confirmed_hotel_stay: false,
      has_confirmed_transport: false,
      assigned_room_count: 0,
      preparation_ready: false,
    };

    return {
      id: group.id,
      group_number: group.group_number,
      name: group.name,
      package_version: row.package_versions
        ? {
            id: row.package_versions.id,
            name: row.package_versions.version_name,
          }
        : null,
      status: row.travel_group_statuses
        ? {
            id: row.travel_group_statuses.id,
            status_code: row.travel_group_statuses.status_code,
            name: row.travel_group_statuses.name,
          }
        : null,
      departure_date: toDateStr(group.departure_date),
      return_date: toDateStr(group.return_date),
      maximum_capacity: group.maximum_capacity,
      current_capacity: counts.active_member_count,
      active_member_count: counts.active_member_count,
      ready_member_count: counts.ready_member_count,
      preparation_ready: counts.preparation_ready,
      created_at: group.created_at,
      updated_at: group.updated_at,
      is_deleted: group.is_deleted,
    };
  }

  private mapDetailRow(row: any, members: any[]) {
    const group = row.travel_groups;
    const status = row.travel_group_statuses;
    const currentCapacity = members.filter(
      (m) => m.status_code === 'ACTIVE',
    ).length;
    return {
      id: group.id,
      group_number: group.group_number,
      name: group.name,
      package_version: row.package_versions
        ? {
            id: row.package_versions.id,
            name: row.package_versions.version_name,
          }
        : null,
      status: status
        ? {
            id: status.id,
            status_code: status.status_code,
            name: status.name,
          }
        : null,
      status_code: status?.status_code ?? null,
      departure_date: toDateStr(group.departure_date),
      return_date: toDateStr(group.return_date),
      maximum_capacity: group.maximum_capacity,
      current_capacity: currentCapacity,
      remarks: group.remarks,
      members,
      created_at: group.created_at,
      updated_at: group.updated_at,
      created_by: group.created_by,
      updated_by: group.updated_by,
      is_deleted: group.is_deleted,
    };
  }
}
