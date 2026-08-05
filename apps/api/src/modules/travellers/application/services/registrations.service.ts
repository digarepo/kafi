import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, like, max, not, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreateRegistrationDto,
  RegistrationFiltersDto,
  UpdateRegistrationDto,
  UpdateRegistrationStatusDto,
} from '../dto/registrations.dto.js';
import { createRegistrationCreatedEvent } from '../../domain/events/registration-created.event.js';

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

@Injectable()
export class RegistrationsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listRegistrations(dto: RegistrationFiltersDto) {
    const {
      page,
      page_size,
      search,
      traveller_id,
      package_version_id,
      status_id,
    } = dto;
    const filters = [eq(schema.registrations.is_deleted, false)];
    if (traveller_id)
      filters.push(eq(schema.registrations.traveller_id, traveller_id));
    if (package_version_id)
      filters.push(
        eq(schema.registrations.package_version_id, package_version_id),
      );
    if (status_id)
      filters.push(eq(schema.registrations.registration_status_id, status_id));
    if (search) {
      filters.push(
        or(
          like(schema.registrations.registration_number, `%${search}%`),
          like(schema.travellers.traveller_number, `%${search}%`),
          like(schema.travellers.first_name, `%${search}%`),
          like(schema.travellers.last_name, `%${search}%`),
        ) as any,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.registrations)
        .innerJoin(
          schema.travellers,
          eq(schema.registrations.traveller_id, schema.travellers.id),
        )
        .leftJoin(
          schema.registrationStatuses,
          eq(
            schema.registrations.registration_status_id,
            schema.registrationStatuses.id,
          ),
        )
        .innerJoin(
          schema.packageVersions,
          eq(
            schema.registrations.package_version_id,
            schema.packageVersions.id,
          ),
        )
        .innerJoin(
          schema.packageTemplates,
          eq(
            schema.packageVersions.package_template_id,
            schema.packageTemplates.id,
          ),
        )
        .leftJoin(
          schema.packageVersionStatuses,
          eq(
            schema.packageVersions.package_version_status_id,
            schema.packageVersionStatuses.id,
          ),
        )
        .where(and(...filters))
        .orderBy(desc(schema.registrations.created_at))
        .limit(page_size)
        .offset((page - 1) * page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.registrations)
        .where(eq(schema.registrations.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((r) => this.mapListRow(r)),
      total: count,
      page,
      page_size,
    };
  }

  async getRegistration(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrations)
      .innerJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .leftJoin(
        schema.travellerStatuses,
        eq(schema.travellers.traveller_status_id, schema.travellerStatuses.id),
      )
      .leftJoin(
        schema.countries,
        eq(schema.travellers.country_id, schema.countries.id),
      )
      .leftJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .innerJoin(
        schema.packageVersions,
        eq(schema.registrations.package_version_id, schema.packageVersions.id),
      )
      .innerJoin(
        schema.packageTemplates,
        eq(
          schema.packageVersions.package_template_id,
          schema.packageTemplates.id,
        ),
      )
      .leftJoin(
        schema.packageVersionStatuses,
        eq(
          schema.packageVersions.package_version_status_id,
          schema.packageVersionStatuses.id,
        ),
      )
      .leftJoin(
        schema.currencies,
        eq(schema.packageVersions.currency_id, schema.currencies.id),
      )
      .leftJoin(
        schema.seasons,
        eq(schema.packageVersions.season_id, schema.seasons.id),
      )
      .leftJoin(
        schema.travellerContacts,
        and(
          eq(schema.travellerContacts.traveller_id, schema.travellers.id),
          eq(schema.travellerContacts.is_primary_contact, true),
          eq(schema.travellerContacts.is_deleted, false),
        ),
      )
      .leftJoin(
        schema.contactPersons,
        eq(
          schema.travellerContacts.contact_person_id,
          schema.contactPersons.id,
        ),
      )
      .where(
        and(
          eq(schema.registrations.id, id),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Registration not found');
    return this.mapViewRow(row);
  }

  async createRegistration(dto: CreateRegistrationDto, actorId: string) {
    const [traveller] = await this.db
      .select()
      .from(schema.travellers)
      .where(
        and(
          eq(schema.travellers.id, dto.traveller_id),
          eq(schema.travellers.is_deleted, false),
        ),
      )
      .limit(1);
    if (!traveller) throw new NotFoundException('Traveller not found');

    const packageVersion = await this.getPublishedPackageVersion(
      dto.package_version_id,
    );

    const departure = toDateOrNull(dto.expected_departure_date);
    const returnDate = toDateOrNull(dto.expected_return_date);
    if (departure && returnDate && departure > returnDate) {
      throw new BadRequestException(
        'Expected departure date must be before or equal to return date',
      );
    }

    if (packageVersion.max_capacity !== null) {
      const active = await this.countActiveRegistrations(packageVersion.id);
      if (active >= packageVersion.max_capacity) {
        throw new ConflictException(
          'Package version capacity has been reached',
        );
      }
    }

    const draftStatus = await this.getRegistrationStatus('DRAFT');
    const number = await this.generateRegistrationNumber();
    const id = ulid();

    await this.db.insert(schema.registrations).values({
      id,
      registration_number: number,
      traveller_id: dto.traveller_id,
      package_version_id: packageVersion.id,
      registration_date: new Date(),
      expected_departure_date: departure,
      expected_return_date: returnDate,
      registration_status_id: draftStatus.id,
      remarks: dto.remarks ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    const event = createRegistrationCreatedEvent({
      registration_id: id,
      traveller_id: dto.traveller_id,
      package_version_id: packageVersion.id,
      registration_number: number,
      created_at: new Date().toISOString(),
    });
    this.eventEmitter.emit(event.type, event);

    return this.getRegistration(id);
  }

  async updateRegistration(
    id: string,
    dto: UpdateRegistrationDto,
    actorId: string,
  ) {
    const existing = await this.getRegistration(id);
    if (existing.status === 'CANCELLED') {
      throw new ConflictException('Cannot update a cancelled registration');
    }

    const departure =
      dto.expected_departure_date !== undefined
        ? toDateOrNull(dto.expected_departure_date)
        : existing.expected_departure_date;
    const returnDate =
      dto.expected_return_date !== undefined
        ? toDateOrNull(dto.expected_return_date)
        : existing.expected_return_date;

    if (departure && returnDate && departure > returnDate) {
      throw new BadRequestException(
        'Expected departure date must be before or equal to return date',
      );
    }

    await this.db
      .update(schema.registrations)
      .set({
        ...(dto.expected_departure_date !== undefined && {
          expected_departure_date: toDateOrNull(dto.expected_departure_date),
        }),
        ...(dto.expected_return_date !== undefined && {
          expected_return_date: toDateOrNull(dto.expected_return_date),
        }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks ?? null }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.registrations.id, id));
    return this.getRegistration(id);
  }

  async updateRegistrationStatus(
    id: string,
    dto: UpdateRegistrationStatusDto,
    actorId: string,
  ) {
    const existing = await this.getRegistration(id);
    if (existing.status === 'CANCELLED') {
      throw new ConflictException(
        'Cannot change status of a cancelled registration',
      );
    }

    const status = await this.db
      .select()
      .from(schema.registrationStatuses)
      .where(eq(schema.registrationStatuses.id, dto.registration_status_id))
      .limit(1);
    if (status.length === 0)
      throw new NotFoundException('Registration status not found');

    await this.db
      .update(schema.registrations)
      .set({
        registration_status_id: dto.registration_status_id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.registrations.id, id));
    return this.getRegistration(id);
  }

  async archiveRegistration(id: string, actorId: string) {
    await this.getRegistration(id);
    await this.db
      .update(schema.registrations)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.registrations.id, id));
  }

  findRegistrationView(id: string) {
    return this.getRegistration(id);
  }

  // ---- Private helpers ----

  private async getPublishedPackageVersion(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.packageVersions)
      .innerJoin(
        schema.packageVersionStatuses,
        eq(
          schema.packageVersions.package_version_status_id,
          schema.packageVersionStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.packageVersions.id, id),
          eq(schema.packageVersions.is_deleted, false),
          eq(schema.packageVersionStatuses.status_code, 'PUBLISHED'),
        ),
      )
      .limit(1);

    if (!row)
      throw new NotFoundException('Published package version not found');
    return row.package_versions;
  }

  private async countActiveRegistrations(packageVersionId: string) {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.registrations.package_version_id, packageVersionId),
          eq(schema.registrations.is_deleted, false),
          not(eq(schema.registrationStatuses.status_code, 'CANCELLED')),
          not(eq(schema.registrationStatuses.status_code, 'DRAFT')),
        ),
      );
    return row?.count ?? 0;
  }

  private async getRegistrationStatus(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrationStatuses)
      .where(eq(schema.registrationStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new NotFoundException(`Registration status ${code} not found`);
    return row;
  }

  private async generateRegistrationNumber() {
    const year = new Date().getFullYear();
    const [row] = await this.db
      .select({ max: max(schema.registrations.registration_number) })
      .from(schema.registrations)
      .where(like(schema.registrations.registration_number, `REG-${year}-%`));
    let next = 1;
    if (row?.max) {
      const parts = row.max.split('-');
      next = Number(parts[parts.length - 1]) + 1;
    }
    return `REG-${year}-${String(next).padStart(6, '0')}`;
  }

  private mapListRow(row: any) {
    return {
      id: row.registrations.id,
      registration_number: row.registrations.registration_number,
      registration_date: row.registrations.registration_date,
      expected_departure_date: row.registrations.expected_departure_date,
      expected_return_date: row.registrations.expected_return_date,
      status: row.registrationStatuses
        ? {
            id: row.registrationStatuses.id,
            code: row.registrationStatuses.status_code,
            name: row.registrationStatuses.name,
          }
        : null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            traveller_number: row.travellers.traveller_number,
          }
        : null,
      package_version: row.packageVersions
        ? {
            id: row.packageVersions.id,
            package_version_code: row.packageVersions.package_version_code,
            version_name: row.packageVersions.version_name,
          }
        : null,
      package_template: row.packageTemplates
        ? { id: row.packageTemplates.id, name: row.packageTemplates.name }
        : null,
      created_at: row.registrations.created_at,
      updated_at: row.registrations.updated_at,
    };
  }

  private mapViewRow(row: any) {
    return {
      id: row.registrations.id,
      registration_number: row.registrations.registration_number,
      registration_date: row.registrations.registration_date,
      expected_departure_date: row.registrations.expected_departure_date,
      expected_return_date: row.registrations.expected_return_date,
      remarks: row.registrations.remarks,
      status: row.registrationStatuses?.status_code,
      status_name: row.registrationStatuses?.name,
      created_at: row.registrations.created_at,
      updated_at: row.registrations.updated_at,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            middle_name: row.travellers.middle_name,
            last_name: row.travellers.last_name,
            full_name:
              `${row.travellers.first_name} ${row.travellers.last_name}`.trim(),
            traveller_number: row.travellers.traveller_number,
            phone_number: row.travellers.phone_number,
            gender: row.travellers.gender,
            country: row.countries
              ? { id: row.countries.id, name: row.countries.name }
              : null,
            status: row.travellerStatuses
              ? {
                  id: row.travellerStatuses.id,
                  name: row.travellerStatuses.name,
                }
              : null,
          }
        : null,
      package_version: row.packageVersions
        ? {
            id: row.packageVersions.id,
            package_version_code: row.packageVersions.package_version_code,
            version_name: row.packageVersions.version_name,
            departure_date: row.packageVersions.departure_date,
            return_date: row.packageVersions.return_date,
            max_capacity: row.packageVersions.max_capacity,
            status: row.packageVersionStatuses?.status_code,
          }
        : null,
      package_template: row.packageTemplates
        ? { id: row.packageTemplates.id, name: row.packageTemplates.name }
        : null,
      currency: row.currencies
        ? {
            id: row.currencies.id,
            code: row.currencies.currency_code,
            name: row.currencies.name,
          }
        : null,
      currency_code: row.currencies?.currency_code ?? null,
      base_price: row.packageVersions.base_price,
      primary_contact: row.contactPersons
        ? {
            id: row.contactPersons.id,
            name: `${row.contactPersons.first_name} ${row.contactPersons.last_name}`.trim(),
            phone_number: row.contactPersons.phone_number,
          }
        : null,
      season: row.seasons
        ? { id: row.seasons.id, name: row.seasons.name }
        : null,
    };
  }
}
