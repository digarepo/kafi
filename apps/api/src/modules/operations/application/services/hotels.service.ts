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
import {
  CreateHotelDto,
  HotelFiltersDto,
  UpdateHotelDto,
} from '../dto/operations.dto.js';

/**
 * Master hotel catalog management.
 */
@Injectable()
export class HotelsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async listHotels(filters: HotelFiltersDto) {
    const conditions = [eq(schema.hotels.is_deleted, false)];

    if (filters.status_id) {
      conditions.push(eq(schema.hotels.hotel_status_id, filters.status_id));
    }
    if (filters.search) {
      const searchCondition = or(
        like(schema.hotels.name, `%${filters.search}%`),
        like(schema.hotels.hotel_code, `%${filters.search}%`),
      )!;
      if (searchCondition) conditions.push(searchCondition);
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.hotels)
        .leftJoin(
          schema.hotelTypes,
          eq(schema.hotels.hotel_type_id, schema.hotelTypes.id),
        )
        .leftJoin(
          schema.hotelStatuses,
          eq(schema.hotels.hotel_status_id, schema.hotelStatuses.id),
        )
        .where(and(...conditions)!)
        .orderBy(asc(schema.hotels.name))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.hotels)
        .where(eq(schema.hotels.is_deleted, false))
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

  async getHotel(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.hotels)
      .leftJoin(
        schema.hotelTypes,
        eq(schema.hotels.hotel_type_id, schema.hotelTypes.id),
      )
      .leftJoin(
        schema.hotelStatuses,
        eq(schema.hotels.hotel_status_id, schema.hotelStatuses.id),
      )
      .where(
        and(eq(schema.hotels.id, id), eq(schema.hotels.is_deleted, false)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Hotel not found');
    return this.mapRow(row);
  }

  async createHotel(dto: CreateHotelDto, actorId: string) {
    await this.assertUniqueHotelCode(dto.hotel_code);

    const statusId =
      dto.hotel_status_id ?? (await this.statusIdFor('ACTIVE'));

    const id = ulid();
    await this.db.insert(schema.hotels).values({
      id,
      hotel_code: dto.hotel_code,
      name: dto.name,
      address: dto.address ?? null,
      city: dto.city ?? null,
      country: dto.country ?? null,
      phone_number: dto.phone_number ?? null,
      email_address: dto.email_address ?? null,
      hotel_type_id: dto.hotel_type_id ?? null,
      hotel_status_id: statusId,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getHotel(id);
  }

  async updateHotel(id: string, dto: UpdateHotelDto, actorId: string) {
    const existing = await this.getHotel(id);

    if (dto.hotel_code && dto.hotel_code !== existing.hotel_code) {
      await this.assertUniqueHotelCode(dto.hotel_code);
    }

    await this.db
      .update(schema.hotels)
      .set({
        ...(dto.hotel_code !== undefined && { hotel_code: dto.hotel_code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address ?? null }),
        ...(dto.city !== undefined && { city: dto.city ?? null }),
        ...(dto.country !== undefined && { country: dto.country ?? null }),
        ...(dto.phone_number !== undefined && {
          phone_number: dto.phone_number ?? null,
        }),
        ...(dto.email_address !== undefined && {
          email_address: dto.email_address ?? null,
        }),
        ...(dto.hotel_type_id !== undefined && {
          hotel_type_id: dto.hotel_type_id ?? null,
        }),
        ...(dto.hotel_status_id !== undefined && {
          hotel_status_id: dto.hotel_status_id,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.hotels.id, id));

    return this.getHotel(id);
  }

  async deleteHotel(id: string, actorId: string) {
    await this.getHotel(id);

    const used = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.groupHotelStays)
      .where(
        and(
          eq(schema.groupHotelStays.hotel_id, id),
          eq(schema.groupHotelStays.is_deleted, false),
        ),
      )
      .then((r) => r[0]?.count ?? 0);
    if (used > 0) {
      throw new ConflictException('Hotel is referenced by active stays');
    }

    await this.db
      .update(schema.hotels)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.hotels.id, id));
  }

  private async statusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.hotelStatuses)
      .where(eq(schema.hotelStatuses.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Hotel status ${code} not found`);
    return row.id;
  }

  private async assertUniqueHotelCode(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.hotels)
      .where(
        and(
          eq(schema.hotels.hotel_code, code),
          eq(schema.hotels.is_deleted, false),
        ),
      )
      .limit(1);
    if (row) throw new ConflictException('Hotel code already exists');
  }

  private mapRow(row: any) {
    const hotel = row.hotels;
    return {
      id: hotel.id,
      hotel_code: hotel.hotel_code,
      name: hotel.name,
      address: hotel.address,
      city: hotel.city,
      country: hotel.country,
      phone_number: hotel.phone_number,
      email_address: hotel.email_address,
      hotel_type_id: hotel.hotel_type_id,
      hotel_type: row.hotel_types
        ? {
            id: row.hotel_types.id,
            type_code: row.hotel_types.type_code,
            name: row.hotel_types.name,
          }
        : null,
      hotel_status_id: hotel.hotel_status_id,
      hotel_status: row.hotel_statuses
        ? {
            id: row.hotel_statuses.id,
            status_code: row.hotel_statuses.status_code,
            name: row.hotel_statuses.name,
          }
        : null,
      notes: hotel.notes,
      created_at: hotel.created_at,
      updated_at: hotel.updated_at,
      is_deleted: hotel.is_deleted,
    };
  }
}
