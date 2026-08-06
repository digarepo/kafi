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
  CreateGuaranteeDto,
  ReplaceGuaranteeDto,
  UpdateGuaranteeDto,
} from '../dto/operations.dto.js';

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateOrUndefined(
  value: Date | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Guarantee instrument management for group memberships.
 *
 * The service enforces the single active guarantee rule and the business
 * invariants for guarantee type and date ranges. It does not write to
 * contact persons, currencies, or travel groups; it only validates against
 * them.
 */
@Injectable()
export class GuaranteesService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
  ) {}

  // ---- List / view ----

  async listGuaranteesForMembership(groupMembershipId: string) {
    const rows = await this.db
      .select()
      .from(schema.guarantees)
      .leftJoin(
        schema.contactPersons,
        eq(schema.guarantees.contact_person_id, schema.contactPersons.id),
      )
      .leftJoin(
        schema.currencies,
        eq(schema.guarantees.currency_id, schema.currencies.id),
      )
      .where(
        and(
          eq(schema.guarantees.group_membership_id, groupMembershipId),
          eq(schema.guarantees.is_deleted, false),
        ),
      )
      .orderBy(desc(schema.guarantees.created_at));

    return rows.map((row) => this.mapRow(row));
  }

  async getGuarantee(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.guarantees)
      .leftJoin(
        schema.contactPersons,
        eq(schema.guarantees.contact_person_id, schema.contactPersons.id),
      )
      .leftJoin(
        schema.currencies,
        eq(schema.guarantees.currency_id, schema.currencies.id),
      )
      .leftJoin(
        schema.groupMemberships,
        eq(schema.guarantees.group_membership_id, schema.groupMemberships.id),
      )
      .where(
        and(
          eq(schema.guarantees.id, id),
          eq(schema.guarantees.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Guarantee not found');
    return this.mapRow(row);
  }

  // ---- Mutations ----

  async createGuarantee(dto: CreateGuaranteeDto, actorId: string) {
    await this.assertGroupAllowsGuaranteeChanges(dto.group_membership_id);
    this.validateTypeRules(dto);
    this.assertDateOrder(dto.effective_date, dto.expiry_date);

    const membership = await this.findMembership(dto.group_membership_id);
    if (!membership) throw new NotFoundException('Group membership not found');

    await this.assertNoActiveGuaranteeForMembership(
      dto.group_membership_id,
      undefined,
    );

    const id = ulid();
    const number = await this.numbers.generateGuaranteeNumber();

    await this.db.insert(schema.guarantees).values({
      id,
      guarantee_number: number,
      group_membership_id: dto.group_membership_id,
      registration_id: dto.registration_id,
      guarantee_type: dto.guarantee_type,
      guarantee_status: 'ACTIVE',
      contact_person_id: dto.contact_person_id ?? null,
      instrument_reference: dto.instrument_reference ?? null,
      amount: dto.amount?.toString() ?? null,
      currency_id: dto.currency_id ?? null,
      effective_date: toDateOrNull(dto.effective_date),
      expiry_date: toDateOrNull(dto.expiry_date),
      issuer: dto.issuer ?? null,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getGuarantee(id);
  }

  async updateGuarantee(id: string, dto: UpdateGuaranteeDto, actorId: string) {
    const existing = await this.getGuarantee(id);
    await this.assertGroupAllowsGuaranteeChanges(existing.group_membership_id);

    if (
      ['REPLACED', 'RELEASED', 'REFUNDED', 'EXPIRED'].includes(
        existing.guarantee_status,
      )
    ) {
      throw new ConflictException(
        `Cannot update a guarantee that is already ${existing.guarantee_status}`,
      );
    }

    const merged: CreateGuaranteeDto = {
      group_membership_id: existing.group_membership_id,
      registration_id: existing.registration_id,
      guarantee_type: dto.guarantee_type ?? existing.guarantee_type,
      contact_person_id:
        dto.contact_person_id !== undefined
          ? dto.contact_person_id
          : existing.contact_person_id,
      instrument_reference:
        dto.instrument_reference !== undefined
          ? dto.instrument_reference
          : existing.instrument_reference,
      amount:
        dto.amount !== undefined
          ? dto.amount
          : existing.amount
            ? Number(existing.amount)
            : undefined,
      currency_id:
        dto.currency_id !== undefined ? dto.currency_id : existing.currency_id,
      effective_date:
        dto.effective_date !== undefined
          ? dto.effective_date
          : existing.effective_date,
      expiry_date:
        dto.expiry_date !== undefined ? dto.expiry_date : existing.expiry_date,
      issuer: dto.issuer !== undefined ? dto.issuer : existing.issuer,
      notes: dto.notes !== undefined ? dto.notes : existing.notes,
    } as CreateGuaranteeDto;

    this.validateTypeRules(merged);
    this.assertDateOrder(merged.effective_date, merged.expiry_date);

    await this.db
      .update(schema.guarantees)
      .set({
        guarantee_type: merged.guarantee_type,
        contact_person_id: merged.contact_person_id ?? null,
        instrument_reference: merged.instrument_reference ?? null,
        amount: merged.amount?.toString() ?? null,
        currency_id: merged.currency_id ?? null,
        effective_date: toDateOrNull(merged.effective_date),
        expiry_date: toDateOrNull(merged.expiry_date),
        issuer: merged.issuer ?? null,
        notes: merged.notes ?? null,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.guarantees.id, id));

    return this.getGuarantee(id);
  }

  async replaceGuarantee(
    id: string,
    dto: ReplaceGuaranteeDto,
    actorId: string,
  ) {
    const old = await this.getGuarantee(id);
    if (!['PENDING', 'ACTIVE'].includes(old.guarantee_status)) {
      throw new BadRequestException(
        'Only PENDING or ACTIVE guarantees can be replaced',
      );
    }
    await this.assertGroupAllowsGuaranteeChanges(old.group_membership_id);

    const merged: CreateGuaranteeDto = {
      group_membership_id: old.group_membership_id,
      registration_id: old.registration_id,
      guarantee_type: dto.guarantee_type,
      contact_person_id: dto.contact_person_id,
      instrument_reference: dto.instrument_reference,
      amount: dto.amount,
      currency_id: dto.currency_id,
      effective_date: dto.effective_date,
      expiry_date: dto.expiry_date,
      issuer: dto.issuer,
      notes: dto.notes,
    };

    this.validateTypeRules(merged);
    this.assertDateOrder(merged.effective_date, merged.expiry_date);

    await this.assertNoActiveGuaranteeForMembership(
      old.group_membership_id,
      id,
    );

    const newId = ulid();
    const number = await this.numbers.generateGuaranteeNumber();

    await this.db.insert(schema.guarantees).values({
      id: newId,
      guarantee_number: number,
      group_membership_id: old.group_membership_id,
      registration_id: old.registration_id,
      guarantee_type: merged.guarantee_type,
      guarantee_status: 'ACTIVE',
      contact_person_id: merged.contact_person_id ?? null,
      instrument_reference: merged.instrument_reference ?? null,
      amount: merged.amount?.toString() ?? null,
      currency_id: merged.currency_id ?? null,
      effective_date: toDateOrNull(merged.effective_date),
      expiry_date: toDateOrNull(merged.expiry_date),
      issuer: merged.issuer ?? null,
      previous_guarantee_id: id,
      notes: merged.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    await this.db
      .update(schema.guarantees)
      .set({
        guarantee_status: 'REPLACED',
        replaced_by_id: newId,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.guarantees.id, id));

    return this.getGuarantee(newId);
  }

  async deleteGuarantee(id: string, actorId: string) {
    const existing = await this.getGuarantee(id);
    await this.assertGroupAllowsGuaranteeChanges(existing.group_membership_id);

    await this.db
      .update(schema.guarantees)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.guarantees.id, id));
  }

  // ---- Helpers ----

  private async assertGroupAllowsGuaranteeChanges(groupMembershipId: string) {
    const [membership] = await this.db
      .select()
      .from(schema.groupMemberships)
      .leftJoin(
        schema.travelGroups,
        eq(schema.groupMemberships.travel_group_id, schema.travelGroups.id),
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
          eq(schema.groupMemberships.id, groupMembershipId),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .limit(1);

    if (!membership) throw new NotFoundException('Group membership not found');

    const status = membership.travel_group_statuses?.status_code;
    if (status && ['COMPLETED', 'CANCELLED'].includes(status)) {
      throw new ConflictException(
        'Cannot modify guarantees for a completed or cancelled travel group',
      );
    }
  }

  private async assertNoActiveGuaranteeForMembership(
    groupMembershipId: string,
    excludeId?: string,
  ) {
    const conditions = [
      eq(schema.guarantees.group_membership_id, groupMembershipId),
      eq(schema.guarantees.guarantee_status, 'ACTIVE'),
      eq(schema.guarantees.is_deleted, false),
    ];
    if (excludeId) {
      conditions.push(sql`${schema.guarantees.id} <> ${excludeId}`);
    }

    const [row] = await this.db
      .select()
      .from(schema.guarantees)
      .where(and(...conditions))
      .limit(1);

    if (row) {
      throw new ConflictException(
        'An active guarantee already exists for this membership',
      );
    }
  }

  private async findMembership(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.groupMemberships)
      .where(
        and(
          eq(schema.groupMemberships.id, id),
          eq(schema.groupMemberships.is_deleted, false),
        ),
      )
      .limit(1);
    return row;
  }

  private validateTypeRules(dto: CreateGuaranteeDto) {
    if (dto.guarantee_type === 'PERSON' && !dto.contact_person_id) {
      throw new BadRequestException(
        'PERSON guarantee requires a contact person',
      );
    }
    if (dto.amount !== undefined && dto.amount > 0 && !dto.currency_id) {
      throw new BadRequestException(
        'A currency is required when an amount is provided',
      );
    }
  }

  private assertDateOrder(
    effective: string | undefined | null,
    expiry: string | undefined | null,
  ) {
    if (effective && expiry && effective > expiry) {
      throw new BadRequestException(
        'Effective date cannot be after expiry date',
      );
    }
  }

  private mapRow(row: any) {
    const g = row.guarantees;
    const contact = row.contact_persons;
    const currency = row.currencies;

    const fullName = contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(' ')
      : undefined;

    return {
      id: g.id,
      guarantee_number: g.guarantee_number,
      group_membership_id: g.group_membership_id,
      registration_id: g.registration_id,
      guarantee_type: g.guarantee_type,
      guarantee_status: g.guarantee_status,
      contact_person_id: g.contact_person_id ?? undefined,
      contact_person: contact ? { id: contact.id, full_name: fullName } : null,
      instrument_reference: g.instrument_reference ?? undefined,
      amount: g.amount ? Number(g.amount) : undefined,
      currency_id: g.currency_id ?? undefined,
      currency: currency ? { id: currency.id, code: currency.code } : null,
      effective_date: formatDateOrUndefined(g.effective_date),
      expiry_date: formatDateOrUndefined(g.expiry_date),
      issuer: g.issuer ?? undefined,
      previous_guarantee_id: g.previous_guarantee_id,
      replaced_by_id: g.replaced_by_id,
      notes: g.notes ?? undefined,
      created_at: g.created_at,
      updated_at: g.updated_at,
    };
  }
}
