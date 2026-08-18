import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MySql2Database } from "drizzle-orm/mysql2";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { DATABASE } from "../../../../shared/infrastructure/database/database.provider.js";
import { BusinessNumberService } from "../../../../shared/infrastructure/numbering/business-number.service.js";
import * as schema from "@kafi/database";
import { createVisaApprovedEvent } from "../../domain/events/visa-approved.event.js";
import {
  CreateVisaApplicationDto,
  RecordVisaResultDto,
  UpdateVisaApplicationDto,
  VisaApplicationFiltersDto,
} from "../dto/visa-applications.dto.js";
import { ExpensesService } from "../../../finance/application/services/expenses.service.js";

function toDateOrNull(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

@Injectable()
export class VisaApplicationsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly eventEmitter: EventEmitter2,
    private readonly expenses: ExpensesService
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
      conditions.push(eq(schema.visaApplications.registration_id, filters.registration_id));
    }
    if (filters.status_id) {
      conditions.push(eq(schema.visaApplications.visa_application_status_id, filters.status_id));
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.visaApplications.application_number, term),
          like(schema.visaApplications.visa_number, term),
          like(schema.registrations.registration_number, term),
          like(schema.travellers.traveller_number, term),
          like(schema.travellers.last_name, term)
        )!
      );
    }

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.visaApplications)
        .leftJoin(
          schema.visaApplicationStatuses,
          eq(schema.visaApplications.visa_application_status_id, schema.visaApplicationStatuses.id)
        )
        .leftJoin(
          schema.registrations,
          eq(schema.visaApplications.registration_id, schema.registrations.id)
        )
        .leftJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
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
        eq(schema.visaApplications.visa_application_status_id, schema.visaApplicationStatuses.id)
      )
      .leftJoin(
        schema.registrations,
        eq(schema.visaApplications.registration_id, schema.registrations.id)
      )
      .leftJoin(schema.travellers, eq(schema.registrations.traveller_id, schema.travellers.id))
      .where(and(eq(schema.visaApplications.id, id), eq(schema.visaApplications.is_deleted, false)))
      .limit(1);

    if (!row) throw new NotFoundException("Visa application not found");
    return this.mapDetailRow(row);
  }

  // ---- Mutations ----

  async createVisaApplication(dto: CreateVisaApplicationDto, actorId: string) {
    const registration = await this.findRegistration(dto.registration_id);
    if (!registration) throw new NotFoundException("Registration not found");

    // Enforce that the registration is in PROCESSING
    const regStatus = await this.getRegistrationStatus(registration);
    if (regStatus !== "PROCESSING") {
      throw new BadRequestException(
        "Visa applications can only be created for registrations in PROCESSING"
      );
    }

    const submittedStatus = await this.findStatus("SUBMITTED");
    const submissionDate = dto.submission_date
      ? new Date(dto.submission_date)
      : new Date(todayISO());

    const applicationNumber = await this.numbers.generateVisaApplicationNumber();
    const id = ulid();

    await this.db.insert(schema.visaApplications).values({
      id,
      application_number: applicationNumber,
      registration_id: dto.registration_id,
      submission_date: submissionDate,
      visa_application_status_id: submittedStatus.id,
      visa_cost: dto.visa_cost !== undefined ? String(dto.visa_cost) : null,
      notes: dto.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
    });

    return this.getVisaApplication(id);
  }

  async updateVisaApplication(id: string, dto: UpdateVisaApplicationDto, actorId: string) {
    const existing = await this.getVisaApplication(id);
    if (existing.is_deleted) throw new NotFoundException("Visa application not found");

    const set: any = {
      updated_by: actorId,
    };
    if (dto.submission_date !== undefined)
      set.submission_date = dto.submission_date ? new Date(dto.submission_date) : null;
    if (dto.visa_cost !== undefined)
      set.visa_cost = dto.visa_cost !== null ? String(dto.visa_cost) : null;
    if (dto.notes !== undefined) set.notes = dto.notes ?? null;

    await this.db
      .update(schema.visaApplications)
      .set(set)
      .where(eq(schema.visaApplications.id, id));

    return this.getVisaApplication(id);
  }

  /**
   * Record the external visa decision (APPROVED, REJECTED, or CANCELLED).
   *
   * @remarks
   * - Only SUBMITTED → APPROVED/REJECTED/CANCELLED is allowed.
   *   APPROVED, REJECTED, and CANCELLED are terminal statuses.
   * - Conditional fields are validated based on the target outcome.
   * - Emits `visa.approved` when the outcome is APPROVED.
   */
  async recordVisaResult(id: string, dto: RecordVisaResultDto, actorId: string) {
    const existing = await this.getVisaApplication(id);
    if (existing.is_deleted) throw new NotFoundException("Visa application not found");

    const newStatus = await this.getStatus(dto.visa_application_status_id);
    const currentCode = existing.status?.status_code ?? "SUBMITTED";
    const nextCode = newStatus.status_code;

    this.assertTransition(currentCode, nextCode);
    this.validateResultFields(nextCode, dto);

    if (nextCode === "APPROVED") {
      await this.assertNoApprovedVisa(existing.registration!.id);
      // Visa cost is required when the visa is approved — this is the
      // financially complete state for the visa operational workflow.
      const visaCost = Number(existing.visa_cost ?? 0);
      if (!visaCost || visaCost <= 0) {
        throw new BadRequestException(
          "Visa cost is required before recording an APPROVED outcome. Update the visa application with the actual cost first."
        );
      }
    }

    const set: any = {
      visa_application_status_id: dto.visa_application_status_id,
      updated_by: actorId,
    };

    if (nextCode === "APPROVED") {
      set.visa_number = dto.visa_number!;
      set.approval_date = new Date(dto.approval_date!);
      set.expiry_date = new Date(dto.expiry_date!);
    } else if (nextCode === "REJECTED") {
      set.rejection_date = new Date(dto.rejection_date!);
      set.rejection_reason = dto.rejection_reason!;
    } else if (nextCode === "CANCELLED") {
      set.cancellation_date = new Date(dto.cancellation_date!);
      set.cancellation_reason = dto.cancellation_reason!;
    }

    // Use a transaction so the visa status change and the Finance expense
    // creation are atomic. If the expense creation fails, the visa status
    // update is rolled back.
    if (nextCode === "APPROVED") {
      const visaCost = Number(existing.visa_cost ?? 0);
      await this.db.transaction(async (tx) => {
        await tx.update(schema.visaApplications).set(set).where(eq(schema.visaApplications.id, id));

        if (visaCost > 0) {
          await this.expenses.createExpenseFromOperational(
            {
              expense_category_code: "VISA",
              expense_source_code: "VISA_APPLICATION",
              amount: visaCost,
              expense_date: new Date(dto.approval_date!),
              description: `Visa cost for ${existing.application_number}`,
              attribution_scope: "TRAVELER",
              registration_id: existing.registration!.id,
              traveller_id: existing.traveller?.id,
              source_visa_application_id: id,
              actorId,
            },
            tx
          );
        }
      });
    } else {
      await this.db
        .update(schema.visaApplications)
        .set(set)
        .where(eq(schema.visaApplications.id, id));
    }

    if (nextCode === "APPROVED") {
      this.eventEmitter.emit(
        "visa.approved",
        createVisaApprovedEvent({
          visa_application_id: id,
          application_number: existing.application_number,
          registration_id: existing.registration!.id,
        })
      );
    }

    return this.getVisaApplication(id);
  }

  async softDelete(id: string, actorId: string) {
    const existing = await this.getVisaApplication(id);
    if (existing.is_deleted) throw new NotFoundException("Visa application not found");

    const statusCode = existing.status?.status_code ?? "SUBMITTED";
    if (statusCode !== "SUBMITTED" && statusCode !== "CANCELLED") {
      throw new BadRequestException("Only SUBMITTED or CANCELLED visa applications can be deleted");
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
      .leftJoin(
        schema.registrationStatuses,
        eq(schema.registrations.registration_status_id, schema.registrationStatuses.id)
      )
      .where(eq(schema.registrations.id, id))
      .limit(1);
    return row;
  }

  private async getRegistrationStatus(row: {
    registrations: typeof schema.registrations.$inferSelect;
  }): Promise<string> {
    const statusRow = (row as any).registration_statuses;
    return statusRow?.status_code ?? "";
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
    if (!row) throw new NotFoundException("Visa application status not found");
    return row;
  }

  private async assertNoApprovedVisa(registrationId: string) {
    const existing = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.visaApplications)
      .innerJoin(
        schema.visaApplicationStatuses,
        eq(schema.visaApplications.visa_application_status_id, schema.visaApplicationStatuses.id)
      )
      .where(
        and(
          eq(schema.visaApplications.registration_id, registrationId),
          eq(schema.visaApplications.is_deleted, false),
          eq(schema.visaApplicationStatuses.status_code, "APPROVED")
        )
      );
    if ((existing[0]?.count ?? 0) > 0) {
      throw new ConflictException(
        "An approved visa application already exists for this registration"
      );
    }
  }

  private validateResultFields(outcome: string, dto: RecordVisaResultDto) {
    if (outcome === "APPROVED") {
      if (!dto.visa_number || dto.visa_number.trim().length === 0) {
        throw new BadRequestException("Visa number is required for APPROVED outcome");
      }
      if (!dto.approval_date) {
        throw new BadRequestException("Approval date is required for APPROVED outcome");
      }
      if (!dto.expiry_date) {
        throw new BadRequestException("Expiry date is required for APPROVED outcome");
      }
    } else if (outcome === "REJECTED") {
      if (!dto.rejection_date) {
        throw new BadRequestException("Rejection date is required for REJECTED outcome");
      }
      if (!dto.rejection_reason || dto.rejection_reason.trim().length === 0) {
        throw new BadRequestException("Rejection reason is required for REJECTED outcome");
      }
    } else if (outcome === "CANCELLED") {
      if (!dto.cancellation_date) {
        throw new BadRequestException("Cancellation date is required for CANCELLED outcome");
      }
      if (!dto.cancellation_reason || dto.cancellation_reason.trim().length === 0) {
        throw new BadRequestException("Cancellation reason is required for CANCELLED outcome");
      }
    } else {
      throw new BadRequestException(
        `Invalid visa result outcome: ${outcome}. Expected APPROVED, REJECTED, or CANCELLED`
      );
    }
  }

  private assertTransition(current: string, next: string) {
    if (current === next) return;

    const allowed: Record<string, string[]> = {
      SUBMITTED: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    const list = allowed[current] ?? [];
    if (!list.includes(next)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
    }
  }

  private mapListRow(row: any) {
    const visa = row.visa_applications;
    return {
      id: visa.id,
      application_number: visa.application_number,
      submission_date: toDateOrNull(visa.submission_date),
      approval_date: toDateOrNull(visa.approval_date),
      expiry_date: toDateOrNull(visa.expiry_date),
      visa_number: visa.visa_number,
      rejection_date: toDateOrNull(visa.rejection_date),
      rejection_reason: visa.rejection_reason ?? null,
      cancellation_date: toDateOrNull(visa.cancellation_date),
      cancellation_reason: visa.cancellation_reason ?? null,
      visa_cost: visa.visa_cost ?? null,
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
      status: row.visa_application_statuses
        ? {
            id: row.visa_application_statuses.id,
            status_code: row.visa_application_statuses.status_code,
            name: row.visa_application_statuses.name,
          }
        : null,
      created_at: visa.created_at,
      updated_at: visa.updated_at,
      is_deleted: visa.is_deleted,
    };
  }

  private mapDetailRow(row: any) {
    const visa = row.visa_applications;
    return {
      id: visa.id,
      application_number: visa.application_number,
      submission_date: toDateOrNull(visa.submission_date),
      approval_date: toDateOrNull(visa.approval_date),
      expiry_date: toDateOrNull(visa.expiry_date),
      visa_number: visa.visa_number,
      rejection_date: toDateOrNull(visa.rejection_date),
      rejection_reason: visa.rejection_reason ?? null,
      cancellation_date: toDateOrNull(visa.cancellation_date),
      cancellation_reason: visa.cancellation_reason ?? null,
      visa_cost: visa.visa_cost ?? null,
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
      status: row.visa_application_statuses
        ? {
            id: row.visa_application_statuses.id,
            status_code: row.visa_application_statuses.status_code,
            name: row.visa_application_statuses.name,
          }
        : null,
      notes: visa.notes ?? null,
      created_at: visa.created_at,
      updated_at: visa.updated_at,
      is_deleted: visa.is_deleted,
    };
  }
}
