import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreateGroupMembershipDto,
  GroupMembershipFiltersDto,
  TransferGroupMembershipDto,
  UpdateGroupMembershipStatusDto,
  WaiveGuaranteeDto,
} from '../dto/operations.dto.js';

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
  ) {}

  // ---- List / view ----

  async listMembershipsForGroup(
    groupId: string,
    filters: GroupMembershipFiltersDto,
  ) {
    const conditions = [
      eq(schema.groupMemberships.travel_group_id, groupId),
      eq(schema.groupMemberships.is_deleted, false),
    ];
    if (filters.status_id) {
      conditions.push(
        eq(
          schema.groupMemberships.group_membership_status_id,
          filters.status_id,
        ),
      );
    }

    const [rows, count] = await Promise.all([
      this.db
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
            eq(schema.groupMemberships.is_deleted, false),
          ),
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
        eq(
          schema.groupMemberships.group_membership_status_id,
          schema.groupMembershipStatuses.id,
        ),
      )
      .leftJoin(
        schema.travelGroups,
        eq(schema.groupMemberships.travel_group_id, schema.travelGroups.id),
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
          eq(schema.groupMemberships.id, id),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Group membership not found');
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
    if (!registration) throw new NotFoundException('Registration not found');

    await this.assertNoActiveMembershipForRegistration(dto.registration_id);
    await this.assertCapacityAvailable(group.id, group.maximum_capacity);

    const activeStatus = await this.statusFor('ACTIVE');
    const guaranteeRequired = dto.guarantee_required;
    const guaranteeWaived = dto.guarantee_waived;

    if (guaranteeRequired && !guaranteeWaived) {
      const active = await this.activeGuaranteeForRegistration(
        dto.registration_id,
      );
      if (!active) {
        throw new ConflictException(
          'An active guarantee or a recorded waiver is required',
        );
      }
    }

    const id = ulid();
    const now = new Date();
    await this.db.insert(schema.groupMemberships).values({
      id,
      travel_group_id: dto.travel_group_id,
      registration_id: dto.registration_id,
      group_membership_status_id: activeStatus.id,
      joined_at: now,
      guarantee_required: guaranteeRequired,
      guarantee_waived: guaranteeWaived,
      guarantee_waived_by: guaranteeWaived ? actorId : null,
      guarantee_waived_at: guaranteeWaived ? now : null,
      remarks: dto.remarks ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getMembership(id);
  }

  async updateMembershipStatus(
    id: string,
    dto: UpdateGroupMembershipStatusDto,
    actorId: string,
  ) {
    const membership = await this.getMembership(id);
    const newStatus = await this.getStatus(dto.group_membership_status_id);

    const allowed = this.allowedTransitions(membership.status_code);
    if (!allowed.includes(newStatus.status_code)) {
      throw new BadRequestException(
        `Cannot transition from ${membership.status_code} to ${newStatus.status_code}`,
      );
    }

    const isTerminal = ['CANCELLED', 'COMPLETED', 'TRANSFERRED'].includes(
      newStatus.status_code,
    );

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

  async transferMembership(
    id: string,
    dto: TransferGroupMembershipDto,
    actorId: string,
  ) {
    const old = await this.getMembership(id);
    if (old.status_code !== 'ACTIVE') {
      throw new ConflictException('Only active memberships can be transferred');
    }

    const target = await this.requireAssignableGroup(
      dto.target_travel_group_id,
    );
    if (target.id === old.travel_group_id) {
      throw new BadRequestException('Cannot transfer to the same group');
    }

    await this.assertCapacityAvailable(target.id, target.maximum_capacity);

    const guaranteeRequired = old.guarantee_required;
    const guaranteeWaived =
      dto.guarantee_waived !== undefined
        ? dto.guarantee_waived
        : old.guarantee_waived;

    if (guaranteeRequired && !guaranteeWaived) {
      const active = await this.activeGuaranteeForRegistration(
        old.registration_id,
      );
      if (!active) {
        throw new ConflictException(
          'An active guarantee or a recorded waiver is required',
        );
      }
    }

    const transferredStatus = await this.statusFor('TRANSFERRED');
    await this.db
      .update(schema.groupMemberships)
      .set({
        group_membership_status_id: transferredStatus.id,
        left_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.groupMemberships.id, id));

    const activeStatus = await this.statusFor('ACTIVE');
    const newId = ulid();
    const now = new Date();
    await this.db.insert(schema.groupMemberships).values({
      id: newId,
      travel_group_id: target.id,
      registration_id: old.registration_id,
      group_membership_status_id: activeStatus.id,
      joined_at: now,
      transferred_from_group_membership_id: id,
      guarantee_required: guaranteeRequired,
      guarantee_waived: guaranteeWaived,
      guarantee_waived_by: guaranteeWaived ? actorId : null,
      guarantee_waived_at: guaranteeWaived ? now : null,
      remarks: dto.remarks ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getMembership(newId);
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
    const cancelled = await this.statusFor('CANCELLED');
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
        eq(
          schema.travelGroups.travel_group_status_id,
          schema.travelGroupStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travelGroups.id, groupId),
          eq(schema.travelGroups.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Travel group not found');
    const status = row.travel_group_statuses?.status_code;
    if (!status || ['DEPARTED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new ConflictException(
        'Registrations cannot be assigned to a departed, completed, or cancelled group',
      );
    }
    return row.travel_groups;
  }

  private async findRegistration(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, id),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  private async assertNoActiveMembershipForRegistration(
    registrationId: string,
  ) {
    const active = await this.statusFor('ACTIVE');
    const [existing] = await this.db
      .select()
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.registration_id, registrationId),
          eq(schema.groupMemberships.group_membership_status_id, active.id),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .limit(1);
    if (existing) {
      throw new ConflictException(
        'Registration already has an active group membership',
      );
    }
  }

  private async assertCapacityAvailable(groupId: string, maximum: number) {
    const active = await this.statusFor('ACTIVE');
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.travel_group_id, groupId),
          eq(schema.groupMemberships.group_membership_status_id, active.id),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      );
    if (row.count >= maximum) {
      throw new ConflictException(
        'Travel group has reached its maximum capacity',
      );
    }
  }

  private async activeGuaranteeForRegistration(registrationId: string) {
    const [row] = await this.db
      .select()
      .from(schema.guarantees)
      .where(
        and(
          eq(schema.guarantees.registration_id, registrationId),
          eq(schema.guarantees.guarantee_status, 'ACTIVE'),
          eq(schema.guarantees.is_deleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  private async statusFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new BadRequestException(`Membership status ${code} not found`);
    return row;
  }

  private async getStatus(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMembershipStatuses)
      .where(eq(schema.groupMembershipStatuses.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Group membership status not found');
    return row;
  }

  private allowedTransitions(from: string): string[] {
    const map: Record<string, string[]> = {
      ACTIVE: ['CANCELLED', 'COMPLETED', 'TRANSFERRED'],
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
    const traveller = row.travellers;
    const group = row.travel_groups;

    return {
      id: m.id,
      travel_group_id: m.travel_group_id,
      registration_id: m.registration_id,
      travel_group: group
        ? { id: group.id, name: group.name, group_number: group.group_number }
        : null,
      registration: reg
        ? { id: reg.id, registration_number: reg.registration_number }
        : null,
      traveller: traveller
        ? {
            id: traveller.id,
            first_name: traveller.first_name,
            last_name: traveller.last_name,
          }
        : null,
      status: status
        ? { id: status.id, status_code: status.status_code, name: status.name }
        : null,
      status_code: status?.status_code ?? null,
      joined_at: m.joined_at,
      left_at: m.left_at,
      transferred_from_group_membership_id:
        m.transferred_from_group_membership_id,
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
