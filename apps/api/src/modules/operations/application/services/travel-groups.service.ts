import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { BusinessNumberService } from './business-number.service.js';
import {
  ChangeTravelGroupStatusDto,
  CreateTravelGroupDto,
  TravelGroupFiltersDto,
  UpdateTravelGroupDto,
} from '../dto/operations.dto.js';

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
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
        .where(eq(schema.travelGroups.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    const data = await Promise.all(
      rows.map(async (row) => this.mapListRow(row)),
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

  async changeStatus(
    id: string,
    dto: ChangeTravelGroupStatusDto,
    actorId: string,
  ) {
    const group = await this.getTravelGroup(id);
    const newStatus = await this.getTravelGroupStatus(
      dto.travel_group_status_id,
    );

    const allowed = this.allowedTransitions(group.status_code);
    if (!allowed.includes(newStatus.status_code)) {
      throw new BadRequestException(
        `Cannot transition from ${group.status_code} to ${newStatus.status_code}`,
      );
    }

    await this.db
      .update(schema.travelGroups)
      .set({
        travel_group_status_id: dto.travel_group_status_id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travelGroups.id, id));

    return this.getTravelGroup(id);
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

  private allowedTransitions(from: string): string[] {
    const map: Record<string, string[]> = {
      PLANNING: ['OPEN', 'CANCELLED'],
      OPEN: ['CLOSED', 'CANCELLED'],
      CLOSED: ['DEPARTED', 'CANCELLED'],
      DEPARTED: ['COMPLETED', 'CANCELLED'],
      COMPLETED: ['CANCELLED'],
      CANCELLED: [],
    };
    return map[from] ?? [];
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

  private async mapListRow(row: any) {
    const group = row.travel_groups;
    const activeStatus = await this.activeMembershipStatus();
    const [count] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.travel_group_id, group.id),
          eq(
            schema.groupMemberships.group_membership_status_id,
            activeStatus.id,
          ),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      );

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
      departure_date: group.departure_date,
      return_date: group.return_date,
      maximum_capacity: group.maximum_capacity,
      current_capacity: count.count,
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
      departure_date: group.departure_date,
      return_date: group.return_date,
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
