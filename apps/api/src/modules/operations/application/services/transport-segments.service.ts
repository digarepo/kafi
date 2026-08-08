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
  CreateTransportSegmentDto,
  TransportSegmentFiltersDto,
  UpdateTransportSegmentDto,
} from '../dto/operations.dto.js';

/**
 * Ground transport segment planning for travel groups.
 */
@Injectable()
export class TransportSegmentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
  ) {}

  async listSegments(filters: TransportSegmentFiltersDto) {
    const conditions = [eq(schema.transportSegments.is_deleted, false)];

    if (filters.travel_group_id) {
      conditions.push(
        eq(schema.transportSegments.travel_group_id, filters.travel_group_id),
      );
    }
    if (filters.vendor_id) {
      conditions.push(
        eq(schema.transportSegments.vendor_id, filters.vendor_id),
      );
    }

    const [rows, count] = await Promise.all([
      this.db
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
        .where(and(...conditions)!)
        .orderBy(
          asc(schema.transportSegments.travel_group_id),
          asc(schema.transportSegments.segment_order),
        )
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.transportSegments)
        .where(eq(schema.transportSegments.is_deleted, false))
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

  async getSegment(id: string) {
    const [row] = await this.db
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
          eq(schema.transportSegments.id, id),
          eq(schema.transportSegments.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Transport segment not found');
    return this.mapRow(row);
  }

  async createSegment(dto: CreateTransportSegmentDto, actorId: string) {
    const travelGroup = await this.findTravelGroup(dto.travel_group_id);
    if (!travelGroup) throw new NotFoundException('Travel group not found');

    await this.assertVendorExists(dto.vendor_id);
    await this.assertDateWindow(
      travelGroup,
      dto.departure_datetime,
      dto.arrival_datetime,
    );
    await this.assertArrivalAfterDeparture(
      dto.departure_datetime,
      dto.arrival_datetime,
    );

    const statusId =
      dto.transport_segment_status_id ?? (await this.statusIdFor('PLANNED'));
    const number = await this.numbers.generateTransportSegmentNumber();

    const id = ulid();
    await this.db.insert(schema.transportSegments).values({
      id,
      transport_segment_number: number,
      travel_group_id: dto.travel_group_id,
      vendor_id: dto.vendor_id,
      transport_type: dto.transport_type,
      segment_order: dto.segment_order,
      origin_location: dto.origin_location,
      destination_location: dto.destination_location,
      origin_type: dto.origin_type ?? null,
      destination_type: dto.destination_type ?? null,
      departure_datetime: dto.departure_datetime
        ? new Date(dto.departure_datetime)
        : null,
      arrival_datetime: dto.arrival_datetime
        ? new Date(dto.arrival_datetime)
        : null,
      vehicle_identifier: dto.vehicle_identifier ?? null,
      driver_name: dto.driver_name ?? null,
      driver_phone_number: dto.driver_phone_number ?? null,
      transport_segment_status_id: statusId,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getSegment(id);
  }

  async updateSegment(
    id: string,
    dto: UpdateTransportSegmentDto,
    actorId: string,
  ) {
    const existing = await this.getSegment(id);
    const travelGroup = await this.findTravelGroup(existing.travel_group_id);

    const departure = dto.departure_datetime ?? existing.departure_datetime;
    const arrival = dto.arrival_datetime ?? existing.arrival_datetime;

    await this.assertDateWindow(travelGroup, departure, arrival);
    await this.assertArrivalAfterDeparture(departure, arrival);

    if (dto.vendor_id) {
      await this.assertVendorExists(dto.vendor_id);
    }

    await this.db
      .update(schema.transportSegments)
      .set({
        ...(dto.vendor_id !== undefined && { vendor_id: dto.vendor_id }),
        ...(dto.transport_type !== undefined && {
          transport_type: dto.transport_type,
        }),
        ...(dto.segment_order !== undefined && {
          segment_order: dto.segment_order,
        }),
        ...(dto.origin_location !== undefined && {
          origin_location: dto.origin_location,
        }),
        ...(dto.destination_location !== undefined && {
          destination_location: dto.destination_location,
        }),
        ...(dto.origin_type !== undefined && {
          origin_type: dto.origin_type ?? null,
        }),
        ...(dto.destination_type !== undefined && {
          destination_type: dto.destination_type ?? null,
        }),
        ...(dto.departure_datetime !== undefined && {
          departure_datetime: new Date(dto.departure_datetime),
        }),
        ...(dto.arrival_datetime !== undefined && {
          arrival_datetime: dto.arrival_datetime
            ? new Date(dto.arrival_datetime)
            : null,
        }),
        ...(dto.vehicle_identifier !== undefined && {
          vehicle_identifier: dto.vehicle_identifier ?? null,
        }),
        ...(dto.driver_name !== undefined && {
          driver_name: dto.driver_name ?? null,
        }),
        ...(dto.driver_phone_number !== undefined && {
          driver_phone_number: dto.driver_phone_number ?? null,
        }),
        ...(dto.transport_segment_status_id !== undefined && {
          transport_segment_status_id: dto.transport_segment_status_id,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.transportSegments.id, id));

    return this.getSegment(id);
  }

  async deleteSegment(id: string, actorId: string) {
    await this.getSegment(id);

    await this.db
      .update(schema.transportSegments)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.transportSegments.id, id));
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

  private async assertVendorExists(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.vendors)
      .where(
        and(eq(schema.vendors.id, id), eq(schema.vendors.is_deleted, false)),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Vendor not found');
  }

  private async statusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.transportSegmentStatuses)
      .where(eq(schema.transportSegmentStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new BadRequestException(`Transport status ${code} not found`);
    return row.id;
  }

  private assertDateWindow(
    travelGroup: any,
    departure: string | null | undefined,
    arrival: string | null | undefined,
  ) {
    const ret = travelGroup.return_date
      ? new Date(travelGroup.return_date)
      : null;
    const start = travelGroup.departure_date
      ? new Date(travelGroup.departure_date)
      : null;

    if (departure) {
      const dep = new Date(departure);
      if (start && dep < start) {
        throw new BadRequestException(
          'Departure cannot be before travel group departure',
        );
      }
    }
    if (arrival) {
      const arr = new Date(arrival);
      if (departure) {
        const dep = new Date(departure);
        if (arr < dep) {
          throw new BadRequestException('Arrival cannot be before departure');
        }
      }
      if (ret && arr > ret) {
        throw new BadRequestException(
          'Arrival cannot be after travel group return',
        );
      }
    }
  }

  private assertArrivalAfterDeparture(
    departure: string | null | undefined,
    arrival: string | null | undefined,
  ) {
    if (!departure || !arrival) return;
    if (new Date(arrival) <= new Date(departure)) {
      throw new BadRequestException('Arrival must be after departure');
    }
  }

  private mapRow(row: any) {
    const segment = row.transport_segments;
    return {
      id: segment.id,
      transport_segment_number: segment.transport_segment_number,
      travel_group_id: segment.travel_group_id,
      travel_group: row.travel_groups
        ? { id: row.travel_groups.id, name: row.travel_groups.name }
        : null,
      vendor_id: segment.vendor_id,
      vendor: row.vendors
        ? {
            id: row.vendors.id,
            vendor_number: row.vendors.vendor_number,
            name: row.vendors.name,
          }
        : null,
      transport_type: segment.transport_type,
      segment_order: segment.segment_order,
      origin_location: segment.origin_location,
      destination_location: segment.destination_location,
      origin_type: segment.origin_type,
      destination_type: segment.destination_type,
      departure_datetime: segment.departure_datetime,
      arrival_datetime: segment.arrival_datetime,
      vehicle_identifier: segment.vehicle_identifier,
      driver_name: segment.driver_name,
      driver_phone_number: segment.driver_phone_number,
      transport_segment_status_id: segment.transport_segment_status_id,
      status: row.transport_segment_statuses
        ? {
            id: row.transport_segment_statuses.id,
            status_code: row.transport_segment_statuses.status_code,
            name: row.transport_segment_statuses.name,
          }
        : null,
      notes: segment.notes,
      created_at: segment.created_at,
      updated_at: segment.updated_at,
      is_deleted: segment.is_deleted,
    };
  }
}
