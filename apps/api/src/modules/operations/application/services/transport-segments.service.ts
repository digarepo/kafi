import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, eq, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { BusinessNumberService } from './business-number.service.js';
import { assertGroupAllowsAccommodationChange } from './group-state-guard.js';
import {
  CreateTransportSegmentDto,
  TransportSegmentFiltersDto,
  UpdateTransportSegmentDto,
} from '../dto/operations.dto.js';
import { ExpensesService } from '../../../finance/application/services/expenses.service.js';
import { ExpenseAdjustmentsService } from '../../../finance/application/services/expense-adjustments.service.js';

/**
 * Ground transport segment recording for travel groups.
 *
 * Transport is a lightweight confirmation record — Kafi records a segment
 * only after the Saudi partner has confirmed the arrangement. Segments are
 * created directly as CONFIRMED. There is no PLANNED workflow for MVP.
 */
@Injectable()
export class TransportSegmentsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly expenses: ExpensesService,
    private readonly adjustments: ExpenseAdjustmentsService,
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

    // Group-state guard — block mutations in protected states
    await assertGroupAllowsAccommodationChange(
      this.db,
      dto.travel_group_id,
      'create transport segment',
    );

    if (dto.vendor_id) {
      await this.assertVendorExists(dto.vendor_id);
    }

    // Segments are always created as CONFIRMED — Kafi records a segment only
    // after the Saudi partner has confirmed the arrangement.
    // Transport cost is required — a confirmed segment is a financially
    // complete operational event.
    const transportCost = Number(dto.transport_cost ?? 0);
    if (!transportCost || transportCost <= 0) {
      throw new BadRequestException(
        'Transport cost is required to create a confirmed transport segment',
      );
    }

    const statusId = await this.statusIdFor('CONFIRMED');
    const number = await this.numbers.generateTransportSegmentNumber();

    // Auto-assign segment_order if not provided
    const segmentOrder =
      dto.segment_order ?? (await this.nextSegmentOrder(dto.travel_group_id));

    const id = ulid();
    // Use a transaction so the transport segment insert and the Finance
    // expense creation are atomic.
    await this.db.transaction(async (tx) => {
      await tx.insert(schema.transportSegments).values({
        id,
        transport_segment_number: number,
        travel_group_id: dto.travel_group_id,
        vendor_id: dto.vendor_id ?? null,
        transport_type: dto.transport_type ?? null,
        segment_order: segmentOrder,
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
        transport_cost: String(transportCost),
        notes: dto.notes ?? null,
        created_by: actorId,
        updated_by: actorId,
      });

      // Auto-create a Finance expense for the transport cost, linked to
      // the originating transport segment. Group-scoped because transport
      // is a shared group expense.
      await this.expenses.createExpenseFromOperational(
        {
          expense_category_code: 'TRANSPORT',
          expense_source_code: 'TRANSPORT_SEGMENT',
          amount: transportCost,
          expense_date: dto.departure_datetime
            ? new Date(dto.departure_datetime)
            : new Date(),
          description: `Transport cost for ${number}`,
          attribution_scope: 'GROUP',
          travel_group_id: dto.travel_group_id,
          source_transport_segment_id: id,
          actorId,
        },
        tx,
      );
    });

    return this.getSegment(id);
  }

  async updateSegment(
    id: string,
    dto: UpdateTransportSegmentDto,
    actorId: string,
  ) {
    const existing = await this.getSegment(id);

    // Group-state guard — block mutations in protected states
    await assertGroupAllowsAccommodationChange(
      this.db,
      existing.travel_group_id,
      'update transport segment',
    );

    if (dto.vendor_id) {
      await this.assertVendorExists(dto.vendor_id);
    }

    await this.db
      .update(schema.transportSegments)
      .set({
        ...(dto.vendor_id !== undefined && {
          vendor_id: dto.vendor_id ?? null,
        }),
        ...(dto.transport_type !== undefined && {
          transport_type: dto.transport_type ?? null,
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
          departure_datetime: dto.departure_datetime
            ? new Date(dto.departure_datetime)
            : null,
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
        ...(dto.transport_cost !== undefined && {
          transport_cost:
            dto.transport_cost !== null ? String(dto.transport_cost) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.transportSegments.id, id));

    return this.getSegment(id);
  }

  async deleteSegment(id: string, actorId: string) {
    const existing = await this.getSegment(id);

    // Group-state guard — block mutations in protected states
    await assertGroupAllowsAccommodationChange(
      this.db,
      existing.travel_group_id,
      'delete transport segment',
    );

    // Hard delete: soft-deleted rows would block re-creation due to the
    // unique constraint (travel_group_id, segment_order).
    // The original Finance expense is NOT deleted — it remains as a
    // historical cost. Record an explicit adjustment for the supplier
    // refund (negative — recovery of transport cost).
    const transportCost = Number(existing.transport_cost ?? 0);
    await this.db
      .delete(schema.transportSegments)
      .where(eq(schema.transportSegments.id, id));

    if (transportCost > 0) {
      const [expense] = await this.db
        .select({ id: schema.expenses.id })
        .from(schema.expenses)
        .where(
          and(
            eq(schema.expenses.source_transport_segment_id, id),
            eq(schema.expenses.is_deleted, false),
          ),
        )
        .limit(1);
      if (expense) {
        try {
          await this.adjustments.createAdjustment(
            {
              expense_id: expense.id,
              adjustment_type: 'SUPPLIER_REFUND',
              amount: -transportCost,
              adjustment_date: new Date(),
              reason: 'Transport segment deleted — supplier refund',
              source_record_type: 'TRANSPORT_SEGMENT',
              source_record_id: id,
              source_record_number: existing.transport_segment_number,
            } as any,
            actorId,
          );
        } catch {
          // Adjustment may already exist — acceptable.
        }
      }
    }
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

  private async nextSegmentOrder(travelGroupId: string): Promise<number> {
    const rows = await this.db
      .select({
        segment_order: schema.transportSegments.segment_order,
      })
      .from(schema.transportSegments)
      .where(
        and(
          eq(schema.transportSegments.travel_group_id, travelGroupId),
          eq(schema.transportSegments.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.transportSegments.segment_order));
    if (rows.length === 0) return 1;
    return Math.max(...rows.map((r) => r.segment_order)) + 1;
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
      transport_cost: segment.transport_cost ?? null,
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
