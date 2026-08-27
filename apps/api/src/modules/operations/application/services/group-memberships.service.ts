import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MySql2Database } from "drizzle-orm/mysql2";
import { and, asc, eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { DATABASE } from "../../../../shared/infrastructure/database/database.provider.js";
import * as schema from "@kafi/database";
import {
  CreateGroupMembershipDto,
  GroupMembershipFiltersDto,
  TransferGroupMembershipDto,
  UpdateGroupMembershipStatusDto,
  WaiveGuaranteeDto,
} from "../dto/operations.dto.js";
import { RoomAssignmentsService } from "./room-assignments.service.js";

/**
 * Group membership lifecycle, capacity enforcement, transfers, and guarantee
 * waiver handling.
 *
 * The service only writes to `group_memberships`. It reads `travel_groups`,
 * `registrations`, and `guarantees` for validation.
 */
@Injectable()
export class GroupMembershipsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly roomAssignments: RoomAssignmentsService
  ) {}

  // ---- List / view ----

  async listMembershipsForGroup(groupId: string, filters: GroupMembershipFiltersDto) {
    const conditions = [
      eq(schema.groupMemberships.travel_group_id, groupId),
      eq(schema.groupMemberships.is_deleted, false),
    ];
    if (filters.status_id) {
      conditions.push(eq(schema.groupMemberships.group_membership_status_id, filters.status_id));
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.groupMemberships)
        .leftJoin(
          schema.groupMembershipStatuses,
          eq(schema.groupMemberships.group_membership_status_id, schema.groupMembershipStatuses.id)
        )
        .leftJoin(
          schema.registrations,
          eq(schema.groupMemberships.registration_id, schema.registrations.id)
        )
        .leftJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
        .where(and(...conditions))
        .orderBy(asc(schema.groupMemberships.joined_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.groupMemberships)
        .where(
          and(
            eq(schema.groupMemberships.travel_group_id, groupId),
            eq(schema.groupMemberships.is_deleted, false)
          )
        )
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((row) => this.mapRow(row)),
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getMembership(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMemberships)
      .leftJoin(
        schema.groupMembershipStatuses,
        eq(schema.groupMemberships.group_membership_status_id, schema.groupMembershipStatuses.id)
      )
      .leftJoin(
        schema.travelGroups,
        eq(schema.groupMemberships.travel_group_id, schema.travelGroups.id)
      )
      .leftJoin(
        schema.registrations,
        eq(schema.groupMemberships.registration_id, schema.registrations.id)
      )
      .leftJoin(
        schema.registrationStatuses,
        eq(schema.registrations.registration_status_id, schema.registrationStatuses.id)
      )
      .leftJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
      .where(and(eq(schema.groupMemberships.id, id), eq(schema.groupMemberships.is_deleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException("Group membership not found");
    return this.mapRow(row);
  }

  async listStatuses() {
    const rows = await this.db
      .select({
        id: schema.groupMembershipStatuses.id,
        status_code: schema.groupMembershipStatuses.status_code,
        name: schema.groupMembershipStatuses.name,
      })
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.is_deleted, false))
      .orderBy(asc(schema.groupMembershipStatuses.display_order));
    return rows;
  }

  // ---- Mutations ----

  async createMembership(dto: CreateGroupMembershipDto, actorId: string) {
    const group = await this.requireAssignableGroup(dto.travel_group_id);

    const registration = await this.findRegistration(dto.registration_id);
    if (!registration) throw new NotFoundException("Registration not found");
    if (registration.status_code !== "READY_FOR_TRAVEL") {
      throw new ConflictException(
        "Registration must be READY_FOR_TRAVEL to be assigned to a travel group"
      );
    }
    if (registration.package_version_id !== group.package_version_id) {
      throw new ConflictException(
        "Registration package version must match the travel group package version"
      );
    }
    await this.assertNoActiveMembershipForRegistration(dto.registration_id);
    await this.assertCapacityAvailable(group.id, group.maximum_capacity);

    const activeStatus = await this.statusFor("ACTIVE");

    // Guarantee is established at registration intake. Group assignment must
    // not be where staff complete registration requirements; the registration
    // guarantee is read-only here. A registration that reached
    // READY_FOR_TRAVEL has already satisfied its guarantee gate, so no
    // additional guarantee check is required at this stage.

    const id = ulid();
    const now = new Date();
    await this.db.insert(schema.groupMemberships).values({
      id,
      travel_group_id: dto.travel_group_id,
      registration_id: dto.registration_id,
      group_membership_status_id: activeStatus.id,
      joined_at: now,
      // Preserve historical guarantee flags from the registration's intake.
      guarantee_required: false,
      guarantee_waived: false,
      remarks: dto.remarks ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getMembership(id);
  }

  async updateMembershipStatus(id: string, dto: UpdateGroupMembershipStatusDto, actorId: string) {
    const membership = await this.getMembership(id);
    const newStatus = await this.getStatus(dto.group_membership_status_id);

    const allowed = this.allowedTransitions(membership.status_code);
    if (!allowed.includes(newStatus.status_code)) {
      throw new BadRequestException(
        `Cannot transition from ${membership.status_code} to ${newStatus.status_code}`
      );
    }

    // Membership cannot be cancelled or transferred out of a group that has
    // already advanced past the planning stage. Removing a member from a
    // prepared/departed/completed group would corrupt readiness calculations
    // and historical records.
    if (
      ["CANCELLED", "TRANSFERRED"].includes(newStatus.status_code) &&
      membership.travel_group_id
    ) {
      await this.assertGroupAllowsMembershipChange(membership.travel_group_id);
    }

    const isTerminal = ["CANCELLED", "COMPLETED", "TRANSFERRED"].includes(newStatus.status_code);

    // Release all active room assignments when a membership becomes inactive.
    // This prevents orphaned assignments that would inflate room occupancy.
    if (isTerminal) {
      await this.roomAssignments.releaseAssignmentsForMembership(id, actorId);
    }

    await this.db
      .update(schema.groupMemberships)
      .set({
        group_membership_status_id: newStatus.id,
        left_at: isTerminal ? new Date() : null,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.groupMemberships.id, id));

    return this.getMembership(id);
  }

  async transferMembership(id: string, dto: TransferGroupMembershipDto, actorId: string) {
    const old = await this.getMembership(id);
    if (old.status_code !== "ACTIVE") {
      throw new ConflictException("Only active memberships can be transferred");
    }
    if (old.registration_status_code !== "READY_FOR_TRAVEL") {
      throw new ConflictException(
        "Registration must be READY_FOR_TRAVEL to be assigned to a travel group"
      );
    }

    const target = await this.requireAssignableGroup(dto.target_travel_group_id);
    if (target.id === old.travel_group_id) {
      throw new BadRequestException("Cannot transfer to the same group");
    }

    const registration = await this.findRegistration(old.registration_id);
    if (!registration) {
      throw new NotFoundException("Registration not found");
    }
    if (registration.package_version_id !== target.package_version_id) {
      throw new ConflictException(
        "Registration package version must match the target travel group package version"
      );
    }

    await this.assertCapacityAvailable(target.id, target.maximum_capacity);

    // Guarantee is owned by registration intake. Transfers do not re-evaluate
    // or rewrite guarantee state; the registration guarantee travels with the
    // registration.
    //
    // Historical group expense allocations remain with the original consuming
    // group. Transfer does NOT re-attribute expenses — the `travel_group_id`
    // on existing expense_allocations and expenses is not modified. Only the
    // new membership points to the target group; historical financial records
    // retain their original group attribution for accurate profitability
    // reporting per group.

    const transferredStatus = await this.statusFor("TRANSFERRED");
    const activeStatus = await this.statusFor("ACTIVE");
    const newId = ulid();
    const now = new Date();

    // Use a transaction so that the old membership status change, room
    // assignment release, and new membership creation are atomic. If any
    // step fails, the entire transfer is rolled back.
    return this.db.transaction(async (tx) => {
      // Release all active room assignments in the old group before
      // transferring. A transferred traveler must not continue occupying
      // rooms in the old group.
      await this.roomAssignments.releaseAssignmentsForMembership(id, actorId);

      await tx
        .update(schema.groupMemberships)
        .set({
          group_membership_status_id: transferredStatus.id,
          left_at: now,
          updated_at: now,
          updated_by: actorId,
        })
        .where(eq(schema.groupMemberships.id, id));

      await tx.insert(schema.groupMemberships).values({
        id: newId,
        travel_group_id: target.id,
        registration_id: old.registration_id,
        group_membership_status_id: activeStatus.id,
        joined_at: now,
        transferred_from_group_membership_id: id,
        guarantee_required: false,
        guarantee_waived: false,
        remarks: dto.remarks ?? null,
        created_by: actorId,
        updated_by: actorId,
      });

      return this.getMembership(newId);
    });
  }

  async waiveGuarantee(id: string, dto: WaiveGuaranteeDto, actorId: string) {
    const now = new Date();
    await this.db
      .update(schema.groupMemberships)
      .set({
        guarantee_waived: dto.waived,
        guarantee_waived_by: dto.waived ? actorId : null,
        guarantee_waived_at: dto.waived ? now : null,
        remarks: dto.remarks !== undefined ? dto.remarks : null,
        updated_at: now,
        updated_by: actorId,
      })
      .where(eq(schema.groupMemberships.id, id));
    return this.getMembership(id);
  }

  async deleteMembership(id: string, actorId: string) {
    const membership = await this.getMembership(id);
    if (membership.travel_group_id) {
      await this.assertGroupAllowsMembershipChange(membership.travel_group_id);
    }
    const cancelled = await this.statusFor("CANCELLED");
    await this.db
      .update(schema.groupMemberships)
      .set({
        group_membership_status_id: cancelled.id,
        left_at: new Date(),
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.groupMemberships.id, id));
  }

  // ---- Helpers ----

  private async requireAssignableGroup(groupId: string) {
    const [row] = await this.db
      .select()
      .from(schema.travelGroups)
      .leftJoin(
        schema.travelGroupStatuses,
        eq(schema.travelGroups.travel_group_status_id, schema.travelGroupStatuses.id)
      )
      .where(and(eq(schema.travelGroups.id, groupId), eq(schema.travelGroups.is_deleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException("Travel group not found");
    const status = row.travel_group_statuses?.status_code;
    if (!status || ["DEPARTED", "COMPLETED", "CANCELLED"].includes(status)) {
      throw new ConflictException(
        "Registrations cannot be assigned to a departed, completed, or cancelled group"
      );
    }
    return row.travel_groups;
  }

  private async findRegistration(id: string) {
    const [row] = await this.db
      .select({
        id: schema.registrations.id,
        status_code: schema.registrationStatuses.status_code,
        package_version_id: schema.registrations.package_version_id,
      })
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(schema.registrations.registration_status_id, schema.registrationStatuses.id)
      )
      .where(and(eq(schema.registrations.id, id), eq(schema.registrations.is_deleted, false)))
      .limit(1);
    return row;
  }

  private async assertNoActiveMembershipForRegistration(registrationId: string) {
    const active = await this.statusFor("ACTIVE");
    const [existing] = await this.db
      .select()
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.registration_id, registrationId),
          eq(schema.groupMemberships.group_membership_status_id, active.id),
          eq(schema.groupMemberships.is_deleted, false)
        )
      )
      .limit(1);
    if (existing) {
      throw new ConflictException("Registration already has an active group membership");
    }
  }

  private async assertCapacityAvailable(groupId: string, maximum: number) {
    const active = await this.statusFor("ACTIVE");
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.travel_group_id, groupId),
          eq(schema.groupMemberships.group_membership_status_id, active.id),
          eq(schema.groupMemberships.is_deleted, false)
        )
      );
    if (row.count >= maximum) {
      throw new ConflictException("Travel group has reached its maximum capacity");
    }
  }

  /**
   * Prevents membership removal (delete or status change to CANCELLED /
   * TRANSFERRED) when the owning group has already advanced to a protected
   * state. Protected states are TRAVEL_PREPARED, DEPARTED, and COMPLETED.
   */
  private async assertGroupAllowsMembershipChange(groupId: string) {
    const [row] = await this.db
      .select({
        status_code: schema.travelGroupStatuses.status_code,
      })
      .from(schema.travelGroups)
      .innerJoin(
        schema.travelGroupStatuses,
        eq(schema.travelGroups.travel_group_status_id, schema.travelGroupStatuses.id)
      )
      .where(and(eq(schema.travelGroups.id, groupId), eq(schema.travelGroups.is_deleted, false)))
      .limit(1);

    const protectedStates = ["TRAVEL_PREPARED", "DEPARTED", "COMPLETED"];
    if (row && protectedStates.includes(row.status_code)) {
      throw new ConflictException(
        `Cannot remove a membership from a ${row.status_code} travel group`
      );
    }
  }

  private async statusFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Membership status ${code} not found`);
    return row;
  }

  private async getStatus(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Group membership status not found");
    return row;
  }

  private allowedTransitions(from: string): string[] {
    const map: Record<string, string[]> = {
      ACTIVE: ["CANCELLED", "COMPLETED", "TRANSFERRED"],
      CANCELLED: [],
      COMPLETED: [],
      TRANSFERRED: [],
    };
    return map[from] ?? [];
  }

  private mapRow(row: any) {
    const m = row.group_memberships;
    const status = row.group_membership_statuses;
    const reg = row.registrations;
    const regStatus = row.registration_statuses;
    const traveller = row.travellers;
    const group = row.travel_groups;

    return {
      id: m.id,
      travel_group_id: m.travel_group_id,
      registration_id: m.registration_id,
      travel_group: group
        ? { id: group.id, name: group.name, group_number: group.group_number }
        : null,
      registration: reg ? { id: reg.id, registration_number: reg.registration_number } : null,
      registration_status: regStatus
        ? {
            id: regStatus.id,
            status_code: regStatus.status_code,
            name: regStatus.name,
          }
        : null,
      registration_status_code: regStatus?.status_code ?? null,
      traveller: traveller
        ? {
            id: traveller.id,
            first_name: traveller.first_name,
            last_name: traveller.last_name,
          }
        : null,
      status: status ? { id: status.id, status_code: status.status_code, name: status.name } : null,
      status_code: status?.status_code ?? null,
      joined_at: m.joined_at,
      left_at: m.left_at,
      transferred_from_group_membership_id: m.transferred_from_group_membership_id,
      guarantee_required: m.guarantee_required,
      guarantee_waived: m.guarantee_waived,
      guarantee_waived_by: m.guarantee_waived_by,
      guarantee_waived_at: m.guarantee_waived_at,
      remarks: m.remarks,
      created_at: m.created_at,
      updated_at: m.updated_at,
    };
  }
}
