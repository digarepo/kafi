import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, like, max, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreatePayerDto,
  PayerFiltersDto,
  UpdatePayerDto,
} from '../dto/payers.dto.js';
import { ReferenceDataService } from './reference-data.service.js';

/**
 * Owns the `Payer` aggregate: creation, updates, archival, and
 * payer-type-specific validation.
 *
 * @remarks
 * - **Invariants:** `payer_type = ORGANIZATION` requires
 *   `organization_name`; `payer_type = INDIVIDUAL` requires either
 *   `traveller_id` or `contact_person_id`.
 */
@Injectable()
export class PayersService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listPayers(dto: PayerFiltersDto) {
    const { page, page_size, search, payer_type_id, payer_status_id } = dto;
    const filters = [eq(schema.payers.is_deleted, false)];
    if (payer_type_id)
      filters.push(eq(schema.payers.payer_type_id, payer_type_id));
    if (payer_status_id)
      filters.push(eq(schema.payers.payer_status_id, payer_status_id));
    if (search) {
      filters.push(
        or(
          like(schema.payers.payer_number, `%${search}%`),
          like(schema.payers.organization_name, `%${search}%`),
          like(schema.payers.contact_name, `%${search}%`),
          like(schema.payers.phone_number, `%${search}%`),
        ) as any,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.payers)
        .leftJoin(
          schema.payerTypes,
          eq(schema.payers.payer_type_id, schema.payerTypes.id),
        )
        .leftJoin(
          schema.payerStatuses,
          eq(schema.payers.payer_status_id, schema.payerStatuses.id),
        )
        .where(and(...filters))
        .orderBy(desc(schema.payers.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.payers)
        .where(and(...filters))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((row) => this.mapRow(row)),
      total: count,
      page,
      page_size,
    };
  }

  async getPayer(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.payers)
      .leftJoin(
        schema.payerTypes,
        eq(schema.payers.payer_type_id, schema.payerTypes.id),
      )
      .leftJoin(
        schema.payerStatuses,
        eq(schema.payers.payer_status_id, schema.payerStatuses.id),
      )
      .where(and(eq(schema.payers.id, id), eq(schema.payers.is_deleted, false)))
      .limit(1);
    if (!row) throw new NotFoundException('Payer not found');
    return this.mapRow(row);
  }

  async createPayer(dto: CreatePayerDto, actorId: string) {
    const payerType = await this.referenceData.getPayerType(dto.payer_type_id);
    this.assertPayerTypeInvariants(payerType.type_code, dto);

    const activeStatus =
      await this.referenceData.getPayerStatusByCode('ACTIVE');
    const number = await this.generatePayerNumber();
    const id = ulid();

    await this.db.insert(schema.payers).values({
      id,
      payer_number: number,
      payer_type_id: dto.payer_type_id,
      traveller_id: dto.traveller_id ?? null,
      contact_person_id: dto.contact_person_id ?? null,
      organization_name: dto.organization_name ?? null,
      contact_name: dto.contact_name ?? null,
      phone_number: dto.phone_number ?? null,
      email_address: dto.email_address ?? null,
      payer_status_id: activeStatus.id,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getPayer(id);
  }

  async updatePayer(id: string, dto: UpdatePayerDto, actorId: string) {
    await this.getPayer(id);
    await this.db
      .update(schema.payers)
      .set({
        ...(dto.payer_status_id !== undefined && {
          payer_status_id: dto.payer_status_id,
        }),
        ...(dto.organization_name !== undefined && {
          organization_name: dto.organization_name ?? null,
        }),
        ...(dto.contact_name !== undefined && {
          contact_name: dto.contact_name ?? null,
        }),
        ...(dto.phone_number !== undefined && {
          phone_number: dto.phone_number ?? null,
        }),
        ...(dto.email_address !== undefined && {
          email_address: dto.email_address ?? null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.payers.id, id));
    return this.getPayer(id);
  }

  async archivePayer(id: string, actorId: string) {
    await this.getPayer(id);
    await this.db
      .update(schema.payers)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.payers.id, id));
  }

  // ---- Private helpers ----

  /**
   * Enforces payer-type-specific required fields.
   *
   * @param typeCode - The resolved `payer_types.type_code` for the payer.
   * @param dto - Payer input to validate.
   * @throws BadRequestException - When a required field for the type is missing.
   */
  private assertPayerTypeInvariants(typeCode: string, dto: CreatePayerDto) {
    if (typeCode === 'ORGANIZATION' && !dto.organization_name) {
      throw new BadRequestException(
        'organization_name is required for ORGANIZATION payers',
      );
    }
    if (
      typeCode === 'INDIVIDUAL' &&
      !dto.traveller_id &&
      !dto.contact_person_id
    ) {
      throw new BadRequestException(
        'traveller_id or contact_person_id is required for INDIVIDUAL payers',
      );
    }
  }

  private async generatePayerNumber() {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(schema.payers.payer_number) })
      .from(schema.payers)
      .where(like(schema.payers.payer_number, `PAYR-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `PAYR-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapRow(row: any) {
    return {
      id: row.payers.id,
      payer_number: row.payers.payer_number,
      traveller_id: row.payers.traveller_id,
      contact_person_id: row.payers.contact_person_id,
      organization_name: row.payers.organization_name,
      contact_name: row.payers.contact_name,
      phone_number: row.payers.phone_number,
      email_address: row.payers.email_address,
      notes: row.payers.notes,
      payer_type: row.payer_types
        ? {
            id: row.payer_types.id,
            code: row.payer_types.type_code,
            name: row.payer_types.name,
          }
        : null,
      status: row.payer_statuses
        ? {
            id: row.payer_statuses.id,
            code: row.payer_statuses.status_code,
            name: row.payer_statuses.name,
          }
        : null,
      created_at: row.payers.created_at,
      updated_at: row.payers.updated_at,
    };
  }
}
