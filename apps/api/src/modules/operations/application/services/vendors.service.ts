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
  CreateVendorDto,
  UpdateVendorDto,
  VendorFiltersDto,
} from '../dto/operations.dto.js';

/**
 * Partner agency / vendor catalog management.
 */
@Injectable()
export class VendorsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
  ) {}

  async listVendors(filters: VendorFiltersDto) {
    const conditions = [eq(schema.vendors.is_deleted, false)];

    if (filters.status_id) {
      conditions.push(eq(schema.vendors.vendor_status_id, filters.status_id));
    }
    if (filters.search) {
      const searchCondition = or(
        like(schema.vendors.name, `%${filters.search}%`),
        like(schema.vendors.vendor_number, `%${filters.search}%`),
      )!;
      if (searchCondition) conditions.push(searchCondition);
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.vendors)
        .leftJoin(
          schema.vendorTypes,
          eq(schema.vendors.vendor_type_id, schema.vendorTypes.id),
        )
        .leftJoin(
          schema.vendorStatuses,
          eq(schema.vendors.vendor_status_id, schema.vendorStatuses.id),
        )
        .where(and(...conditions)!)
        .orderBy(asc(schema.vendors.name))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.vendors)
        .where(eq(schema.vendors.is_deleted, false))
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

  async getVendor(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.vendors)
      .leftJoin(
        schema.vendorTypes,
        eq(schema.vendors.vendor_type_id, schema.vendorTypes.id),
      )
      .leftJoin(
        schema.vendorStatuses,
        eq(schema.vendors.vendor_status_id, schema.vendorStatuses.id),
      )
      .where(
        and(eq(schema.vendors.id, id), eq(schema.vendors.is_deleted, false)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Vendor not found');
    return this.mapRow(row);
  }

  async createVendor(dto: CreateVendorDto, actorId: string) {
    const statusId =
      dto.vendor_status_id ?? (await this.statusIdFor('ACTIVE'));
    const typeId =
      dto.vendor_type_id ?? (await this.typeIdFor('AGENCY'));
    const number = await this.numbers.generateVendorNumber();

    const id = ulid();
    await this.db.insert(schema.vendors).values({
      id,
      vendor_number: number,
      name: dto.name,
      vendor_type_id: typeId,
      contact_person_name: dto.contact_person_name ?? null,
      phone_number: dto.phone_number ?? null,
      alternate_phone_number: dto.alternate_phone_number ?? null,
      email_address: dto.email_address ?? null,
      address: dto.address ?? null,
      tax_identification_number: dto.tax_identification_number ?? null,
      license_number: dto.license_number ?? null,
      vendor_status_id: statusId,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getVendor(id);
  }

  async updateVendor(id: string, dto: UpdateVendorDto, actorId: string) {
    await this.getVendor(id);

    await this.db
      .update(schema.vendors)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.vendor_type_id !== undefined && {
          vendor_type_id: dto.vendor_type_id,
        }),
        ...(dto.contact_person_name !== undefined && {
          contact_person_name: dto.contact_person_name ?? null,
        }),
        ...(dto.phone_number !== undefined && {
          phone_number: dto.phone_number ?? null,
        }),
        ...(dto.alternate_phone_number !== undefined && {
          alternate_phone_number: dto.alternate_phone_number ?? null,
        }),
        ...(dto.email_address !== undefined && {
          email_address: dto.email_address ?? null,
        }),
        ...(dto.address !== undefined && { address: dto.address ?? null }),
        ...(dto.tax_identification_number !== undefined && {
          tax_identification_number: dto.tax_identification_number ?? null,
        }),
        ...(dto.license_number !== undefined && {
          license_number: dto.license_number ?? null,
        }),
        ...(dto.vendor_status_id !== undefined && {
          vendor_status_id: dto.vendor_status_id,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.vendors.id, id));

    return this.getVendor(id);
  }

  async deleteVendor(id: string, actorId: string) {
    await this.getVendor(id);

    const used = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.transportSegments)
      .where(
        and(
          eq(schema.transportSegments.vendor_id, id),
          eq(schema.transportSegments.is_deleted, false),
        ),
      )
      .then((r) => r[0]?.count ?? 0);
    if (used > 0) {
      throw new ConflictException('Vendor is referenced by transport segments');
    }

    await this.db
      .update(schema.vendors)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.vendors.id, id));
  }

  private async statusIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.vendorStatuses)
      .where(eq(schema.vendorStatuses.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Vendor status ${code} not found`);
    return row.id;
  }

  private async typeIdFor(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.vendorTypes)
      .where(eq(schema.vendorTypes.type_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Vendor type ${code} not found`);
    return row.id;
  }

  private mapRow(row: any) {
    const vendor = row.vendors;
    return {
      id: vendor.id,
      vendor_number: vendor.vendor_number,
      name: vendor.name,
      vendor_type_id: vendor.vendor_type_id,
      vendor_type: row.vendor_types
        ? {
            id: row.vendor_types.id,
            type_code: row.vendor_types.type_code,
            name: row.vendor_types.name,
          }
        : null,
      vendor_status_id: vendor.vendor_status_id,
      vendor_status: row.vendor_statuses
        ? {
            id: row.vendor_statuses.id,
            status_code: row.vendor_statuses.status_code,
            name: row.vendor_statuses.name,
          }
        : null,
      contact_person_name: vendor.contact_person_name,
      phone_number: vendor.phone_number,
      alternate_phone_number: vendor.alternate_phone_number,
      email_address: vendor.email_address,
      address: vendor.address,
      tax_identification_number: vendor.tax_identification_number,
      license_number: vendor.license_number,
      notes: vendor.notes,
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
      is_deleted: vendor.is_deleted,
    };
  }
}
