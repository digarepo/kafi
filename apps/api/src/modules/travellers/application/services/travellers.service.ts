import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, like, max, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CheckDuplicateDto,
  ContactPersonListFiltersDto,
  CreateContactPersonDto,
  CreateTravellerContactDto,
  CreateTravellerDto,
  TravellerListFiltersDto,
  UpdateContactPersonDto,
  UpdateTravellerContactDto,
  UpdateTravellerDto,
} from '../dto/travellers.dto.js';

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function todayYmd(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function assertDobNotInFuture(date?: string | null) {
  if (date && date > todayYmd()) {
    throw new BadRequestException('Date of birth cannot be in the future');
  }
}

@Injectable()
export class TravellersService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  // ---- Reference data ----

  async listTravellerStatuses() {
    const rows = await this.db
      .select()
      .from(schema.travellerStatuses)
      .where(eq(schema.travellerStatuses.is_active, true))
      .orderBy(asc(schema.travellerStatuses.display_order));
    return rows.map((row) => ({ ...row, code: row.status_code }));
  }

  async listTravellerSources() {
    const rows = await this.db
      .select()
      .from(schema.travellerSources)
      .where(eq(schema.travellerSources.is_active, true))
      .orderBy(asc(schema.travellerSources.display_order));
    return rows.map((row) => ({ ...row, code: row.source_code }));
  }

  async listRelationshipTypes() {
    const rows = await this.db
      .select()
      .from(schema.relationshipTypes)
      .where(eq(schema.relationshipTypes.is_active, true))
      .orderBy(asc(schema.relationshipTypes.display_order));
    return rows.map((row) => ({ ...row, code: row.relationship_code }));
  }

  async listContactPersonStatuses() {
    const rows = await this.db
      .select()
      .from(schema.contactPersonStatuses)
      .where(eq(schema.contactPersonStatuses.is_active, true))
      .orderBy(asc(schema.contactPersonStatuses.display_order));
    return rows.map((row) => ({ ...row, code: row.status_code }));
  }

  async listTravellerContactStatuses() {
    const rows = await this.db
      .select()
      .from(schema.travellerContactStatuses)
      .where(eq(schema.travellerContactStatuses.is_active, true))
      .orderBy(asc(schema.travellerContactStatuses.display_order));
    return rows.map((row) => ({ ...row, code: row.status_code }));
  }

  async listRegistrationStatuses() {
    const rows = await this.db
      .select()
      .from(schema.registrationStatuses)
      .where(eq(schema.registrationStatuses.is_active, true))
      .orderBy(asc(schema.registrationStatuses.display_order));

    return rows.map((row) => ({
      ...row,
      code: row.status_code,
    }));
  }

  async listCountries() {
    return this.db
      .select()
      .from(schema.countries)
      .where(eq(schema.countries.is_active, true))
      .orderBy(asc(schema.countries.name));
  }

  async listRegionsByCountry(countryId?: string) {
    const filters = [eq(schema.regions.is_active, true)];
    if (countryId) filters.push(eq(schema.regions.country_id, countryId));
    return this.db
      .select()
      .from(schema.regions)
      .where(and(...filters))
      .orderBy(asc(schema.regions.name));
  }

  async listLanguages() {
    return this.db
      .select()
      .from(schema.languages)
      .where(eq(schema.languages.is_active, true))
      .orderBy(asc(schema.languages.name));
  }

  // ---- Travellers ----

  async listTravellers(dto: TravellerListFiltersDto) {
    const { page, page_size, search, status_id } = dto;
    const where = and(
      eq(schema.travellers.is_deleted, false),
      status_id
        ? eq(schema.travellers.traveller_status_id, status_id)
        : undefined,
      search
        ? or(
            like(schema.travellers.first_name, `%${search}%`),
            like(schema.travellers.last_name, `%${search}%`),
            like(schema.travellers.phone_number, `%${search}%`),
            like(schema.travellers.traveller_number, `%${search}%`),
          )
        : undefined,
    );

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.travellers)
        .leftJoin(
          schema.countries,
          eq(schema.travellers.country_id, schema.countries.id),
        )
        .leftJoin(
          schema.travellerStatuses,
          eq(
            schema.travellers.traveller_status_id,
            schema.travellerStatuses.id,
          ),
        )
        .where(where)
        .orderBy(desc(schema.travellers.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.travellers)
        .where(eq(schema.travellers.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((r) => this.mapTravellerRow(r)),
      total: count,
      page,
      page_size,
    };
  }

  async getTraveller(id: string) {
    const [traveller] = await this.db
      .select()
      .from(schema.travellers)
      .leftJoin(
        schema.countries,
        eq(schema.travellers.country_id, schema.countries.id),
      )
      .leftJoin(
        schema.regions,
        eq(schema.travellers.region_id, schema.regions.id),
      )
      .leftJoin(
        schema.languages,
        eq(schema.travellers.preferred_language_id, schema.languages.id),
      )
      .leftJoin(
        schema.travellerSources,
        eq(schema.travellers.traveller_source_id, schema.travellerSources.id),
      )
      .leftJoin(
        schema.travellerStatuses,
        eq(schema.travellers.traveller_status_id, schema.travellerStatuses.id),
      )
      .where(
        and(
          eq(schema.travellers.id, id),
          eq(schema.travellers.is_deleted, false),
        ),
      )
      .limit(1);

    if (!traveller) throw new NotFoundException('Traveller not found');

    const contacts = await this.db
      .select()
      .from(schema.travellerContacts)
      .innerJoin(
        schema.contactPersons,
        eq(
          schema.travellerContacts.contact_person_id,
          schema.contactPersons.id,
        ),
      )
      .leftJoin(
        schema.relationshipTypes,
        eq(
          schema.travellerContacts.relationship_type_id,
          schema.relationshipTypes.id,
        ),
      )
      .leftJoin(
        schema.travellerContactStatuses,
        eq(
          schema.travellerContacts.traveller_contact_status_id,
          schema.travellerContactStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travellerContacts.traveller_id, id),
          eq(schema.travellerContacts.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.travellerContacts.priority));

    return this.mapTravellerDetail(traveller, contacts);
  }

  async createTraveller(dto: CreateTravellerDto, actorId: string) {
    assertDobNotInFuture(dto.date_of_birth);

    // Prevent duplicate travellers. Match on first_name + phone_number,
    // including soft-deleted records so archived travellers cannot be
    // silently re-created as new profiles.
    const duplicates = await this.findDuplicates(
      dto.first_name,
      dto.phone_number,
    );
    if (duplicates.length > 0) {
      const match = duplicates[0];
      const label = `${match.first_name} ${match.last_name} (${match.traveller_number})`;
      throw new ConflictException(
        match.is_deleted
          ? `A traveller with this name and phone already exists but is archived: ${label}. Restore the archived record instead of creating a new one.`
          : `A traveller with this name and phone already exists: ${label}. Use the existing record instead of creating a duplicate.`,
      );
    }

    const number = await this.generateTravellerNumber();
    const id = ulid();
    await this.db.insert(schema.travellers).values({
      id,
      traveller_number: number,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      last_name: dto.last_name,
      gender: dto.gender,
      date_of_birth: toDateOrNull(dto.date_of_birth),
      phone_number: dto.phone_number,
      email_address: dto.email_address ?? null,
      passport_number: dto.passport_number || null,
      fayda_number: dto.fayda_number || null,
      country_id: dto.country_id,
      region_id: dto.region_id ?? null,
      preferred_language_id: dto.preferred_language_id ?? null,
      traveller_source_id: dto.traveller_source_id ?? null,
      traveller_status_id: dto.traveller_status_id,
      created_by: actorId,
      updated_by: actorId,
    });
    return this.getTraveller(id);
  }

  async updateTraveller(id: string, dto: UpdateTravellerDto, actorId: string) {
    assertDobNotInFuture(dto.date_of_birth);
    await this.getTraveller(id);
    await this.db
      .update(schema.travellers)
      .set({
        ...(dto.first_name !== undefined && { first_name: dto.first_name }),
        ...(dto.middle_name !== undefined && {
          middle_name: dto.middle_name ?? null,
        }),
        ...(dto.last_name !== undefined && { last_name: dto.last_name }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.date_of_birth !== undefined && {
          date_of_birth: toDateOrNull(dto.date_of_birth),
        }),
        ...(dto.phone_number !== undefined && {
          phone_number: dto.phone_number,
        }),
        ...(dto.email_address !== undefined && {
          email_address: dto.email_address ?? null,
        }),
        ...(dto.passport_number !== undefined && {
          passport_number: dto.passport_number || null,
        }),
        ...(dto.fayda_number !== undefined && {
          fayda_number: dto.fayda_number || null,
        }),
        ...(dto.country_id !== undefined && { country_id: dto.country_id }),
        ...(dto.region_id !== undefined && {
          region_id: dto.region_id ?? null,
        }),
        ...(dto.preferred_language_id !== undefined && {
          preferred_language_id: dto.preferred_language_id ?? null,
        }),
        ...(dto.traveller_source_id !== undefined && {
          traveller_source_id: dto.traveller_source_id ?? null,
        }),
        ...(dto.traveller_status_id !== undefined && {
          traveller_status_id: dto.traveller_status_id,
        }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travellers.id, id));
    return this.getTraveller(id);
  }

  async archiveTraveller(id: string, actorId: string) {
    await this.getTraveller(id);
    await this.db
      .update(schema.travellers)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travellers.id, id));
  }

  async checkDuplicate(dto: CheckDuplicateDto, excludeId?: string) {
    const conditions = [
      eq(schema.travellers.first_name, dto.first_name),
      eq(schema.travellers.phone_number, dto.phone_number),
    ];
    if (excludeId)
      conditions.push(sql`${schema.travellers.id} <> ${excludeId}`);

    const rows = await this.db
      .select()
      .from(schema.travellers)
      .leftJoin(
        schema.countries,
        eq(schema.travellers.country_id, schema.countries.id),
      )
      .leftJoin(
        schema.travellerStatuses,
        eq(schema.travellers.traveller_status_id, schema.travellerStatuses.id),
      )
      .where(and(...conditions));

    return {
      possible_matches: rows.map((r) => this.mapTravellerRow(r)),
    };
  }

  /**
   * Finds duplicate travellers by first_name + phone_number, including
   * soft-deleted records. Used by `createTraveller` to hard-block creation
   * when an existing record (active or archived) already matches.
   */
  private async findDuplicates(
    firstName: string,
    phoneNumber: string,
  ): Promise<
    {
      first_name: string;
      last_name: string;
      traveller_number: string;
      is_deleted: boolean;
    }[]
  > {
    const rows = await this.db
      .select({
        first_name: schema.travellers.first_name,
        last_name: schema.travellers.last_name,
        traveller_number: schema.travellers.traveller_number,
        is_deleted: schema.travellers.is_deleted,
      })
      .from(schema.travellers)
      .where(
        and(
          eq(schema.travellers.first_name, firstName),
          eq(schema.travellers.phone_number, phoneNumber),
        ),
      )
      .limit(1);

    return rows;
  }

  // ---- Contact persons ----

  async listContactPersons(dto: ContactPersonListFiltersDto) {
    const { page, page_size, search, status_id } = dto;
    const where = and(
      eq(schema.contactPersons.is_deleted, false),
      status_id
        ? eq(schema.contactPersons.contact_person_status_id, status_id)
        : undefined,
      search
        ? or(
            like(schema.contactPersons.first_name, `%${search}%`),
            like(schema.contactPersons.last_name, `%${search}%`),
            like(schema.contactPersons.phone_number, `%${search}%`),
          )
        : undefined,
    );

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.contactPersons)
        .leftJoin(
          schema.contactPersonStatuses,
          eq(
            schema.contactPersons.contact_person_status_id,
            schema.contactPersonStatuses.id,
          ),
        )
        .where(where)
        .orderBy(desc(schema.contactPersons.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.contactPersons)
        .where(eq(schema.contactPersons.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((r) => this.mapContactPersonRow(r)),
      total: count,
      page,
      page_size,
    };
  }

  async getContactPerson(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.contactPersons)
      .leftJoin(
        schema.countries,
        eq(schema.contactPersons.country_id, schema.countries.id),
      )
      .leftJoin(
        schema.regions,
        eq(schema.contactPersons.region_id, schema.regions.id),
      )
      .leftJoin(
        schema.languages,
        eq(schema.contactPersons.preferred_language_id, schema.languages.id),
      )
      .leftJoin(
        schema.contactPersonStatuses,
        eq(
          schema.contactPersons.contact_person_status_id,
          schema.contactPersonStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.contactPersons.id, id),
          eq(schema.contactPersons.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Contact person not found');
    return this.mapContactPersonRow(row);
  }

  async createContactPerson(dto: CreateContactPersonDto, actorId: string) {
    assertDobNotInFuture(dto.date_of_birth);
    const id = ulid();
    await this.db.insert(schema.contactPersons).values({
      id,
      first_name: dto.first_name,
      middle_name: dto.middle_name ?? null,
      last_name: dto.last_name,
      gender: dto.gender ?? null,
      date_of_birth: toDateOrNull(dto.date_of_birth),
      phone_number: dto.phone_number,
      alternate_phone_number: dto.alternate_phone_number ?? null,
      email_address: dto.email_address ?? null,
      address: dto.address ?? null,
      country_id: dto.country_id ?? null,
      region_id: dto.region_id ?? null,
      preferred_language_id: dto.preferred_language_id ?? null,
      contact_person_status_id: dto.contact_person_status_id,
      created_by: actorId,
      updated_by: actorId,
    });
    return this.getContactPerson(id);
  }

  async updateContactPerson(
    id: string,
    dto: UpdateContactPersonDto,
    actorId: string,
  ) {
    assertDobNotInFuture(dto.date_of_birth);
    await this.getContactPerson(id);
    await this.db
      .update(schema.contactPersons)
      .set({
        ...(dto.first_name !== undefined && { first_name: dto.first_name }),
        ...(dto.middle_name !== undefined && {
          middle_name: dto.middle_name ?? null,
        }),
        ...(dto.last_name !== undefined && { last_name: dto.last_name }),
        ...(dto.gender !== undefined && { gender: dto.gender ?? null }),
        ...(dto.date_of_birth !== undefined && {
          date_of_birth: toDateOrNull(dto.date_of_birth),
        }),
        ...(dto.phone_number !== undefined && {
          phone_number: dto.phone_number,
        }),
        ...(dto.alternate_phone_number !== undefined && {
          alternate_phone_number: dto.alternate_phone_number ?? null,
        }),
        ...(dto.email_address !== undefined && {
          email_address: dto.email_address ?? null,
        }),
        ...(dto.address !== undefined && { address: dto.address ?? null }),
        ...(dto.country_id !== undefined && {
          country_id: dto.country_id ?? null,
        }),
        ...(dto.region_id !== undefined && {
          region_id: dto.region_id ?? null,
        }),
        ...(dto.preferred_language_id !== undefined && {
          preferred_language_id: dto.preferred_language_id ?? null,
        }),
        ...(dto.contact_person_status_id !== undefined && {
          contact_person_status_id: dto.contact_person_status_id,
        }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.contactPersons.id, id));
    return this.getContactPerson(id);
  }

  async archiveContactPerson(id: string, actorId: string) {
    await this.getContactPerson(id);
    await this.db
      .update(schema.contactPersons)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.contactPersons.id, id));
  }

  // ---- Traveller contacts ----

  async listTravellerContacts(travellerId: string) {
    const rows = await this.db
      .select()
      .from(schema.travellerContacts)
      .innerJoin(
        schema.contactPersons,
        eq(
          schema.travellerContacts.contact_person_id,
          schema.contactPersons.id,
        ),
      )
      .leftJoin(
        schema.relationshipTypes,
        eq(
          schema.travellerContacts.relationship_type_id,
          schema.relationshipTypes.id,
        ),
      )
      .leftJoin(
        schema.travellerContactStatuses,
        eq(
          schema.travellerContacts.traveller_contact_status_id,
          schema.travellerContactStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travellerContacts.traveller_id, travellerId),
          eq(schema.travellerContacts.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.travellerContacts.priority));
    return rows.map((r) => this.mapTravellerContactRow(r));
  }

  async createTravellerContact(
    travellerId: string,
    dto: CreateTravellerContactDto,
    actorId: string,
  ) {
    await this.getTraveller(travellerId);
    await this.getContactPerson(dto.contact_person_id);

    if (dto.is_primary_contact) {
      await this.clearPrimaryContactFlag(travellerId);
    }
    if (dto.is_emergency_contact) {
      await this.clearEmergencyContactFlag(travellerId);
    }

    const id = ulid();
    try {
      await this.db.insert(schema.travellerContacts).values({
        id,
        traveller_id: travellerId,
        contact_person_id: dto.contact_person_id,
        relationship_type_id: dto.relationship_type_id,
        is_emergency_contact: dto.is_emergency_contact,
        is_primary_contact: dto.is_primary_contact,
        priority: dto.priority,
        notes: dto.notes ?? null,
        traveller_contact_status_id: dto.traveller_contact_status_id,
        created_by: actorId,
        updated_by: actorId,
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'Duplicate priority or contact for this traveller',
        );
      }
      throw error;
    }
    return this.getTravellerContact(id);
  }

  async getTravellerContact(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.travellerContacts)
      .innerJoin(
        schema.contactPersons,
        eq(
          schema.travellerContacts.contact_person_id,
          schema.contactPersons.id,
        ),
      )
      .leftJoin(
        schema.relationshipTypes,
        eq(
          schema.travellerContacts.relationship_type_id,
          schema.relationshipTypes.id,
        ),
      )
      .leftJoin(
        schema.travellerContactStatuses,
        eq(
          schema.travellerContacts.traveller_contact_status_id,
          schema.travellerContactStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travellerContacts.id, id),
          eq(schema.travellerContacts.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Traveller contact not found');
    return this.mapTravellerContactRow(row);
  }

  async updateTravellerContact(
    id: string,
    dto: UpdateTravellerContactDto,
    actorId: string,
  ) {
    const existing = await this.getTravellerContact(id);
    const travellerId = existing.traveller_id;

    if (dto.is_primary_contact === true) {
      await this.clearPrimaryContactFlag(travellerId, id);
    }
    if (dto.is_emergency_contact === true) {
      await this.clearEmergencyContactFlag(travellerId, id);
    }

    try {
      await this.db
        .update(schema.travellerContacts)
        .set({
          ...(dto.relationship_type_id !== undefined && {
            relationship_type_id: dto.relationship_type_id,
          }),
          ...(dto.is_emergency_contact !== undefined && {
            is_emergency_contact: dto.is_emergency_contact,
          }),
          ...(dto.is_primary_contact !== undefined && {
            is_primary_contact: dto.is_primary_contact,
          }),
          ...(dto.priority !== undefined && { priority: dto.priority }),
          ...(dto.notes !== undefined && { notes: dto.notes ?? null }),
          ...(dto.traveller_contact_status_id !== undefined && {
            traveller_contact_status_id: dto.traveller_contact_status_id,
          }),
          updated_at: new Date(),
          updated_by: actorId,
        })
        .where(eq(schema.travellerContacts.id, id));
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          'Duplicate priority or contact for this traveller',
        );
      }
      throw error;
    }
    return this.getTravellerContact(id);
  }

  async archiveTravellerContact(id: string, actorId: string) {
    await this.getTravellerContact(id);
    await this.db
      .update(schema.travellerContacts)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.travellerContacts.id, id));
  }

  // ---- Private helpers ----

  private async generateTravellerNumber() {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(schema.travellers.traveller_number) })
      .from(schema.travellers)
      .where(like(schema.travellers.traveller_number, `TRV-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `TRV-${year}-${String(next).padStart(6, '0')}`;
  }

  private async clearPrimaryContactFlag(
    travellerId: string,
    excludeId?: string,
  ) {
    const where = and(
      eq(schema.travellerContacts.traveller_id, travellerId),
      eq(schema.travellerContacts.is_primary_contact, true),
      excludeId
        ? sql`${schema.travellerContacts.id} <> ${excludeId}`
        : undefined,
    );
    await this.db
      .update(schema.travellerContacts)
      .set({ is_primary_contact: false })
      .where(where);
  }

  private async clearEmergencyContactFlag(
    travellerId: string,
    excludeId?: string,
  ) {
    const where = and(
      eq(schema.travellerContacts.traveller_id, travellerId),
      eq(schema.travellerContacts.is_emergency_contact, true),
      excludeId
        ? sql`${schema.travellerContacts.id} <> ${excludeId}`
        : undefined,
    );
    await this.db
      .update(schema.travellerContacts)
      .set({ is_emergency_contact: false })
      .where(where);
  }

  private mapTravellerRow(row: any) {
    return {
      id: row.travellers.id,
      traveller_number: row.travellers.traveller_number,
      first_name: row.travellers.first_name,
      middle_name: row.travellers.middle_name,
      last_name: row.travellers.last_name,
      gender: row.travellers.gender,
      date_of_birth: row.travellers.date_of_birth,
      phone_number: row.travellers.phone_number,
      email_address: row.travellers.email_address,
      passport_number: row.travellers.passport_number,
      fayda_number: row.travellers.fayda_number,
      country: row.countries
        ? { id: row.countries.id, name: row.countries.name }
        : null,
      status: row.traveller_statuses
        ? { id: row.traveller_statuses.id, name: row.traveller_statuses.name }
        : null,
      is_deleted: row.travellers.is_deleted,
      created_at: row.travellers.created_at,
      updated_at: row.travellers.updated_at,
    };
  }

  private mapTravellerDetail(traveller: any, contacts: any[]) {
    const row = this.mapTravellerRow(traveller);
    return {
      ...row,
      region: traveller.regions
        ? { id: traveller.regions.id, name: traveller.regions.name }
        : null,
      preferred_language: traveller.languages
        ? { id: traveller.languages.id, name: traveller.languages.name }
        : null,
      source: traveller.traveller_sources
        ? {
            id: traveller.traveller_sources.id,
            name: traveller.traveller_sources.name,
          }
        : null,
      contacts: contacts.map((c) => this.mapTravellerContactRow(c)),
    };
  }

  private mapContactPersonRow(row: any) {
    return {
      id: row.contact_persons.id,
      first_name: row.contact_persons.first_name,
      middle_name: row.contact_persons.middle_name,
      last_name: row.contact_persons.last_name,
      gender: row.contact_persons.gender,
      date_of_birth: row.contact_persons.date_of_birth,
      phone_number: row.contact_persons.phone_number,
      alternate_phone_number: row.contact_persons.alternate_phone_number,
      email_address: row.contact_persons.email_address,
      address: row.contact_persons.address,
      country: row.countries
        ? { id: row.countries.id, name: row.countries.name }
        : null,
      region: row.regions
        ? { id: row.regions.id, name: row.regions.name }
        : null,
      preferred_language: row.languages
        ? { id: row.languages.id, name: row.languages.name }
        : null,
      status: row.contact_person_statuses
        ? {
            id: row.contact_person_statuses.id,
            name: row.contact_person_statuses.name,
          }
        : null,
      is_deleted: row.contact_persons.is_deleted,
      created_at: row.contact_persons.created_at,
      updated_at: row.contact_persons.updated_at,
    };
  }

  private mapTravellerContactRow(row: any) {
    return {
      id: row.traveller_contacts.id,
      traveller_id: row.traveller_contacts.traveller_id,
      contact_person: row.contact_persons
        ? {
            id: row.contact_persons.id,
            first_name: row.contact_persons.first_name,
            last_name: row.contact_persons.last_name,
            phone_number: row.contact_persons.phone_number,
          }
        : null,
      relationship_type: row.relationship_types
        ? { id: row.relationship_types.id, name: row.relationship_types.name }
        : null,
      is_emergency_contact: row.traveller_contacts.is_emergency_contact,
      is_primary_contact: row.traveller_contacts.is_primary_contact,
      priority: row.traveller_contacts.priority,
      notes: row.traveller_contacts.notes,
      status: row.traveller_contact_statuses
        ? {
            id: row.traveller_contact_statuses.id,
            name: row.traveller_contact_statuses.name,
          }
        : null,
      created_at: row.traveller_contacts.created_at,
      updated_at: row.traveller_contacts.updated_at,
    };
  }
}
