import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import * as schema from '@kafi/database';
import { createVisaApprovedEvent } from '../../domain/events/visa-approved.event.js';
import {
  ChangeVisaApplicationStatusDto,
  CreateVisaApplicationDto,
  UpdateVisaApplicationDto,
  VisaApplicationFiltersDto,
} from '../dto/visa-applications.dto.js';

function toDateOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

@Injectable()
export class VisaApplicationsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---- Lookups ----

  async listStatuses() {
    return this.db
      .select()
      .from(schema.visaApplicationStatuses)
      .where(eq(schema.visaApplicationStatuses.is_deleted, false))
      .orderBy(asc(schema.visaApplicationStatuses.display_order));
  }

  // ---- List / view ----

  async listVisaApplications(filters: VisaApplicationFiltersDto) {
    const conditions = [eq(schema.visaApplications.is_deleted, false)];

    if (filters.registration_id) {
      conditions.push(
        eq(schema.visaApplications.registration_id, filters.registration_id),
      );
    }
    if (filters.status_id) {
      conditions.push(
        eq(
          schema.visaApplications.visa_application_status_id,
          filters.status_id,
        ),
      );
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.visaApplications.application_number, term),
          like(schema.visaApplications.visa_number, term),
          like(schema.registrations.registration_number, term),
          like(schema.travellers.traveller_number, term),
          like(schema.travellers.last_name, term),
        )!,
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.visaApplications)
        .leftJoin(
          schema.visaApplicationStatuses,
          eq(
            schema.visaApplications.visa_application_status_id,
            schema.visaApplicationStatuses.id,
          ),
        )
        .leftJoin(
          schema.registrations,
          eq(schema.visaApplications.registration_id, schema.registrations.id),
        )
        .leftJoin(
          schema.travellers,
          eq(schema.registrations.traveller_id, schema.travellers.id),
        )
        .where(and(...conditions)!)
        .orderBy(desc(schema.visaApplications.created_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.visaApplications)
        .where(eq(schema.visaApplications.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((row) => this.mapListRow(row)),
      total: count,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getVisaApplication(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.visaApplications)
      .leftJoin(
        schema.visaApplicationStatuses,
        eq(
          schema.visaApplications.visa_application_status_id,
          schema.visaApplicationStatuses.id,
        ),
      )
      .leftJoin(
        schema.registrations,
        eq(schema.visaApplications.registration_id, schema.registrations.id),
      )
      .leftJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .where(
        and(
          eq(schema.visaApplications.id, id),
          eq(schema.visaApplications.is_deleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Visa application not found');
    return this.mapDetailRow(row);
  }

  // ---- Mutations ----

  async createVisaApplication(dto: CreateVisaApplicationDto, actorId: string) {
    this.assertDateOrder({
      submission_date: dto.submission_date,
      approval_date: dto.approval_date,
    });
    const registration = await this.findRegistration(dto.registration_id);
    if (!registration) throw new NotFoundException('Registration not found');

    let statusId = dto.visa_application_status_id;
    if (!statusId) {
      const draft = await this.findStatus('DRAFT');
      statusId = draft.id;
    }

    const status = await this.getStatus(statusId);
    if (status.status_code === 'APPROVED') {
      await this.assertNoApprovedVisa(dto.registration_id);
    }

    const applicationNumber =
      await this.numbers.generateVisaApplicationNumber();
    const id = ulid();

    await this.db.insert(schema.visaApplications).values({
      id,
      application_number: applicationNumber,
      registration_id: dto.registration_id,
      submission_date: dto.submission_date
        ? new Date(dto.submission_date)
        : null,
      approval_date: dto.approval_date ? new Date(dto.approval_date) : null,
      expiry_date: dto.expiry_date ? new Date(dto.expiry_date) : null,
      visa_number: dto.visa_number ?? null,
      visa_application_status_id: statusId,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    if (status.status_code === 'APPROVED') {
      this.eventEmitter.emit(
        'visa.approved',
        createVisaApprovedEvent({
          visa_application_id: id,
          application_number: applicationNumber,
          registration_id: dto.registration_id,
        }),
      );
    }

    return this.getVisaApplication(id);
  }

  async updateVisaApplication(
    id: string,
    dto: UpdateVisaApplicationDto,
    actorId: string,
  ) {
    const existing = await this.getVisaApplication(id);
    if (existing.is_deleted)
      throw new NotFoundException('Visa application not found');

    const set: any = {
      updated_by: actorId,
    };
    if (dto.submission_date !== undefined)
      set.submission_date = dto.submission_date
        ? new Date(dto.submission_date)
        : null;
    if (dto.approval_date !== undefined)
      set.approval_date = dto.approval_date
        ? new Date(dto.approval_date)
        : null;
    if (dto.expiry_date !== undefined)
      set.expiry_date = dto.expiry_date ? new Date(dto.expiry_date) : null;
    if (dto.visa_number !== undefined)
      set.visa_number = dto.visa_number ?? null;
    if (dto.notes !== undefined) set.notes = dto.notes ?? null;

    this.assertDateOrder({
      submission_date: set.submission_date,
      approval_date: set.approval_date,
    });

    await this.db
      .update(schema.visaApplications)
      .set(set)
      .where(eq(schema.visaApplications.id, id));

    return this.getVisaApplication(id);
  }

  async changeStatus(
    id: string,
    dto: ChangeVisaApplicationStatusDto,
    actorId: string,
  ) {
    const existing = await this.getVisaApplication(id);
    if (existing.is_deleted)
      throw new NotFoundException('Visa application not found');

    const newStatus = await this.getStatus(dto.visa_application_status_id);
    const currentCode = existing.status?.status_code ?? 'DRAFT';
    const nextCode = newStatus.status_code;

    this.assertTransition(currentCode, nextCode);

    if (nextCode === 'APPROVED') {
      await this.assertNoApprovedVisa(existing.registration!.id);
    }

    await this.db
      .update(schema.visaApplications)
      .set({
        visa_application_status_id: dto.visa_application_status_id,
        updated_by: actorId,
      })
      .where(eq(schema.visaApplications.id, id));

    if (nextCode === 'APPROVED') {
      this.eventEmitter.emit(
        'visa.approved',
        createVisaApprovedEvent({
          visa_application_id: id,
          application_number: existing.application_number,
          registration_id: existing.registration!.id,
        }),
      );
    }

    return this.getVisaApplication(id);
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.getVisaApplication(id);
    if (existing.is_deleted)
      throw new NotFoundException('Visa application not found');

    const statusCode = existing.status?.status_code ?? 'DRAFT';
    if (statusCode !== 'DRAFT' && statusCode !== 'CANCELLED') {
      throw new BadRequestException(
        'Only DRAFT or CANCELLED visa applications can be deleted',
      );
    }

    await this.db
      .update(schema.visaApplications)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.visaApplications.id, id));

    return this.getVisaApplication(id);
  }

  // ---- Private helpers ----

  private async findRegistration(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.id, id))
      .limit(1);
    return row;
  }

  private async findStatus(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.visaApplicationStatuses)
      .where(eq(schema.visaApplicationStatuses.status_code, code))
      .limit(1);
    if (!row) throw new BadRequestException(`Visa status ${code} not found`);
    return row;
  }

  private async getStatus(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.visaApplicationStatuses)
      .where(eq(schema.visaApplicationStatuses.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Visa application status not found');
    return row;
  }

  private async assertNoApprovedVisa(registrationId: string) {
    const existing = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.visaApplications)
      .innerJoin(
        schema.visaApplicationStatuses,
        eq(
          schema.visaApplications.visa_application_status_id,
          schema.visaApplicationStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.visaApplications.registration_id, registrationId),
          eq(schema.visaApplications.is_deleted, false),
          eq(schema.visaApplicationStatuses.status_code, 'APPROVED'),
        ),
      );
    if ((existing[0]?.count ?? 0) > 0) {
      throw new ConflictException(
        'An approved visa application already exists for this registration',
      );
    }
  }

  private assertDateOrder(dates: {
    submission_date?: string | Date | null;
    approval_date?: string | Date | null;
  }) {
    if (dates.submission_date && dates.approval_date) {
      if (new Date(dates.approval_date) < new Date(dates.submission_date)) {
        throw new BadRequestException(
          'Approval date must be on or after submission date',
        );
      }
    }
  }

  private assertTransition(current: string, next: string) {
    if (current === next) return;
    const terminal = ['APPROVED', 'REJECTED'];
    if (terminal.includes(current) && next !== 'CANCELLED') {
      throw new BadRequestException(
        `${current} visa applications can only be CANCELLED`,
      );
    }

    const allowed: Record<string, string[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
      CANCELLED: [],
    };

    const list = allowed[current] ?? [];
    if (!list.includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${next}`,
      );
    }
  }

  private mapListRow(row: any) {
    const visa = row.visaApplications;
    return {
      id: visa.id,
      application_number: visa.application_number,
      submission_date: toDateOrNull(visa.submission_date),
      approval_date: toDateOrNull(visa.approval_date),
      expiry_date: toDateOrNull(visa.expiry_date),
      visa_number: visa.visa_number,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
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
      status: row.visaApplicationStatuses
        ? {
            id: row.visaApplicationStatuses.id,
            status_code: row.visaApplicationStatuses.status_code,
            name: row.visaApplicationStatuses.name,
          }
        : null,
      created_at: visa.created_at,
      updated_at: visa.updated_at,
      is_deleted: visa.is_deleted,
    };
  }

  private mapDetailRow(row: any) {
    const visa = row.visaApplications;
    return {
      id: visa.id,
      application_number: visa.application_number,
      submission_date: toDateOrNull(visa.submission_date),
      approval_date: toDateOrNull(visa.approval_date),
      expiry_date: toDateOrNull(visa.expiry_date),
      visa_number: visa.visa_number,
      notes: visa.notes,
      registration: row.registrations
        ? {
            id: row.registrations.id,
            registration_number: row.registrations.registration_number,
          }
        : null,
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            last_name: row.travellers.last_name,
            traveller_number: row.travellers.traveller_number,
            phone_number: row.travellers.phone_number,
          }
        : null,
      status: row.visaApplicationStatuses
        ? {
            id: row.visaApplicationStatuses.id,
            status_code: row.visaApplicationStatuses.status_code,
            name: row.visaApplicationStatuses.name,
          }
        : null,
      created_at: visa.created_at,
      updated_at: visa.updated_at,
      is_deleted: visa.is_deleted,
    };
  }
}
