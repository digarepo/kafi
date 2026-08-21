import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, desc, eq, gte, like, lte, max, not, or, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CancelRegistrationDto,
  CreateRegistrationDto,
  RegistrationFiltersDto,
  UpdateRegistrationDto,
} from '../dto/registrations.dto.js';
import { createRegistrationCreatedEvent } from '../../domain/events/registration-created.event.js';
import { createRegistrationCancelledEvent } from '../../domain/events/registration-cancelled.event.js';
import { RegistrationReadinessService } from './registration-readiness.service.js';
import { PackagesService } from '../../../packages/application/services/packages.service.js';
import { ExpensesService } from '../../../finance/application/services/expenses.service.js';
import { FinanceReportingService } from '../../../finance/application/services/finance-reporting.service.js';
import { RefundsService } from '../../../finance/application/services/refunds.service.js';
import {
  CANCELLATION_SERVICE_CHARGE,
  CANCELLATION_POLICY,
} from '../../../finance/domain/business-policy.js';

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
    private readonly readiness: RegistrationReadinessService,
    private readonly packages: PackagesService,
    private readonly expenses: ExpensesService,
    private readonly financeReporting: FinanceReportingService,
    private readonly refunds: RefundsService,
  ) {}

  async listRegistrations(dto: RegistrationFiltersDto) {
    const {
      page,
      page_size,
      search,
      traveller_id,
      package_version_id,
      status_id,
      departure_from,
      departure_to,
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
    if (departure_from) {
      const from = toDateOrNull(departure_from);
      if (from)
        filters.push(gte(schema.registrations.expected_departure_date, from));
    }
    if (departure_to) {
      const to = toDateOrNull(departure_to);
      if (to)
        filters.push(lte(schema.registrations.expected_departure_date, to));
    }
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
        .select({
          count: sql<number>`count(distinct ${schema.registrations.id})`,
        })
        .from(schema.registrations)
        .innerJoin(
          schema.travellers,
          eq(schema.registrations.traveller_id, schema.travellers.id),
        )
        .where(and(...filters))
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

    const packageVersion = await this.packages.assertAvailableForRegistration(
      dto.package_version_id,
    );

    const departure = toDateOrNull(dto.expected_departure_date);
    const returnDate = toDateOrNull(dto.expected_return_date);
    if (departure && returnDate && departure > returnDate) {
      throw new BadRequestException(
        'Return date must be on or after the departure date',
      );
    }

    // Prevent duplicate registrations. A traveller may have only one
    // non-terminal registration (DRAFT, PROCESSING, READY_FOR_TRAVEL) per
    // package version at a time. Terminal statuses (COMPLETED, CANCELLED)
    // do not block creating a new registration for the same package.
    await this.assertNoActiveRegistrationForPackage(
      dto.traveller_id,
      packageVersion.id,
    );

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
        'Return date must be on or after the departure date',
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

  async startProcessing(id: string, actorId: string) {
    const existing = await this.getRegistration(id);
    if (existing.status === 'CANCELLED') {
      throw new ConflictException(
        'Cannot start processing a cancelled registration',
      );
    }
    if (existing.status === 'PROCESSING') {
      return existing;
    }
    if (existing.status !== 'DRAFT') {
      throw new ConflictException(
        `Cannot start processing from status ${existing.status}`,
      );
    }

    const isComplete = await this.readiness.isRegistrationComplete(id);
    if (!isComplete) {
      throw new ConflictException(
        'Registration intake conditions are not satisfied',
      );
    }

    const processingStatus = await this.getRegistrationStatus('PROCESSING');
    await this.db
      .update(schema.registrations)
      .set({
        registration_status_id: processingStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.registrations.id, id));
    return this.getRegistration(id);
  }

  async confirmReadyForTravel(id: string, actorId: string) {
    const existing = await this.getRegistration(id);
    if (existing.status === 'CANCELLED') {
      throw new ConflictException('Cannot confirm a cancelled registration');
    }
    if (existing.status === 'READY_FOR_TRAVEL') {
      return existing;
    }
    if (existing.status !== 'PROCESSING') {
      throw new ConflictException(
        `Cannot confirm ready from status ${existing.status}`,
      );
    }

    const isReady = await this.readiness.isReadyForTravel(id);
    if (!isReady) {
      throw new ConflictException(
        'Registration readiness conditions are not satisfied',
      );
    }

    const readyStatus = await this.getRegistrationStatus('READY_FOR_TRAVEL');
    await this.db
      .update(schema.registrations)
      .set({
        registration_status_id: readyStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.registrations.id, id));
    return this.getRegistration(id);
  }

  async cancelRegistration(
    id: string,
    dto: CancelRegistrationDto,
    actorId: string,
  ) {
    const existing = await this.getRegistration(id);
    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new ConflictException(
        `Cannot cancel a ${existing.status.toLowerCase()} registration`,
      );
    }

    const [activeMembership] = await this.db
      .select()
      .from(schema.groupMemberships)
      .innerJoin(
        schema.groupMembershipStatuses,
        eq(
          schema.groupMemberships.group_membership_status_id,
          schema.groupMembershipStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.groupMemberships.registration_id, id),
          eq(schema.groupMemberships.is_deleted, false),
          eq(schema.groupMembershipStatuses.status_code, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (activeMembership) {
      throw new ConflictException(
        'Cannot cancel a registration with an active group membership',
      );
    }

    // ---- Hotel booking blocker ----
    // Per locked business policy, a registration with a confirmed hotel
    // booking CANNOT be cancelled. There is no admin override for this.
    if (CANCELLATION_POLICY.hotelBookingBlocksCancellation) {
      const [hotelStay] = await this.db
        .select({ id: schema.groupHotelStays.id })
        .from(schema.groupHotelStays)
        .innerJoin(
          schema.groupMemberships,
          eq(
            schema.groupMemberships.travel_group_id,
            schema.groupHotelStays.travel_group_id,
          ),
        )
        .where(
          and(
            eq(schema.groupMemberships.registration_id, id),
            eq(schema.groupMemberships.is_deleted, false),
            eq(schema.groupHotelStays.is_deleted, false),
          ),
        )
        .limit(1);

      if (hotelStay) {
        throw new ConflictException(
          'Cannot cancel a registration with a confirmed hotel booking',
        );
      }
    }

    // ---- Financial consequences ----
    // Per the locked Round 7 principle, cancelling a registration does NOT
    // cancel or erase the original visa/flight expenses — those represent
    // real costs incurred by Kafi. The customer-side cancellation effects
    // (service charge, visa cost recovery, airline cancellation fee) are
    // represented SEPARATELY:
    //   - The Kafi cancellation/service charge is recorded as a new
    //     CANCELLATION_CHARGE expense (this is a real cost/charge to the
    //     customer, not a duplicate of the visa/flight supplier expense).
    //   - The visa cost and airline cancellation fee are NOT recorded as
    //     new expenses here — the original visa expense already exists, and
    //     the airline cancellation fee is recorded as an adjustment to the
    //     flight expense via the expense adjustment workflow.
    //   - The refundable amount is computed and returned for the admin to
    //     action via the refund workflow.
    const cancellationFinancials = await this.computeCancellationFinancials(id);

    const cancelledStatus = await this.getRegistrationStatus('CANCELLED');
    const now = new Date();

    // Use a transaction so the registration status change and the
    // cancellation service charge expense creation are atomic.
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.registrations)
        .set({
          registration_status_id: cancelledStatus.id,
          cancellation_reason: dto.cancellation_reason ?? null,
          cancelled_at: now,
          cancelled_by: actorId,
          updated_at: now,
          updated_by: actorId,
        })
        .where(eq(schema.registrations.id, id));

      // Record ONLY the Kafi cancellation/service charge as a Finance
      // expense. The original visa/flight expenses are preserved unchanged.
      // Visa cost and airline cancellation fee are NOT double-counted here.
      if (cancellationFinancials.service_charge > 0) {
        await this.expenses.createExpenseFromOperational(
          {
            expense_category_code: 'CANCELLATION_CHARGE',
            expense_source_code: 'CANCELLATION',
            amount: cancellationFinancials.service_charge,
            expense_date: now,
            description: `Cancellation service charge for registration ${existing.registration_number}`,
            notes: dto.cancellation_reason ?? undefined,
            attribution_scope: 'TRAVELER',
            registration_id: id,
            traveller_id: existing.traveller?.id,
            actorId,
          },
          tx,
        );
      }
    });

    const updated = await this.getRegistration(id);
    const event = createRegistrationCancelledEvent({
      registration_id: id,
      registration_number: updated.registration_number,
      traveller_id: updated.traveller!.id,
      package_version_id: updated.package_version!.id,
      reason: dto.cancellation_reason ?? null,
      cancelled_at: now.toISOString(),
      cancelled_by: actorId,
    });
    this.eventEmitter.emit(event.type, event);

    return {
      ...updated,
      cancellation_financials: cancellationFinancials,
    };
  }

  /**
   * Computes the financial consequences of cancelling a registration.
   *
   * @remarks
   * This does NOT delete or modify any existing financial records. It only
   * computes what the traveler is responsible for, based on the locked MVP
   * cancellation policy:
   * - Cancellation service charge (provisional: 15,000 ETB) — recorded as
   *   a new CANCELLATION_CHARGE expense by the caller.
   * - Actual visa cost (if visa was processed) — already exists as a VISA
   *   expense; NOT re-recorded. This value is for customer-side accounting.
   * - Actual flight cancellation fee (if flight was booked) — recorded as
   *   an adjustment to the flight expense via the adjustment workflow, not
   *   here. This value is for customer-side accounting.
   *
   * The `total_charge` represents what the customer owes (service charge +
   * visa cost recovery + airline fee), which is a customer-side figure
   * separate from Kafi's supplier expenses.
   *
   * TODO: The exact retention/refund split remains subject to final client
   * confirmation.
   */
  private async computeCancellationFinancials(registrationId: string) {
    let visaCost = 0;
    let flightCancellationFee = 0;

    // Visa cost (customer-side recovery figure; the original VISA expense
    // is preserved unchanged)
    const [visa] = await this.db
      .select({
        visa_cost: schema.visaApplications.visa_cost,
      })
      .from(schema.visaApplications)
      .where(
        and(
          eq(schema.visaApplications.registration_id, registrationId),
          eq(schema.visaApplications.is_deleted, false),
        ),
      )
      .limit(1);
    if (visa?.visa_cost) {
      visaCost = Number(visa.visa_cost);
    }

    // Flight cancellation fee (customer-side recovery figure; recorded as
    // an adjustment to the flight expense via the adjustment workflow)
    const [flight] = await this.db
      .select({
        cancellation_fee: schema.flightBookings.cancellation_fee,
        supplier_cost: schema.flightBookings.supplier_cost,
      })
      .from(schema.flightBookings)
      .where(
        and(
          eq(schema.flightBookings.registration_id, registrationId),
          eq(schema.flightBookings.is_deleted, false),
        ),
      )
      .limit(1);
    if (flight?.cancellation_fee) {
      flightCancellationFee = Number(flight.cancellation_fee);
    }

    const serviceCharge = CANCELLATION_SERVICE_CHARGE;
    const totalCharge = serviceCharge + visaCost + flightCancellationFee;

    // Get current finance summary to determine refund eligibility
    const summary =
      await this.financeReporting.getRegistrationFinanceSummary(registrationId);
    const refundableAmount = Math.max(summary.total_paid - totalCharge, 0);

    return {
      service_charge: serviceCharge,
      visa_cost: visaCost,
      flight_cancellation_fee: flightCancellationFee,
      total_charge: totalCharge,
      total_paid: summary.total_paid,
      refundable_amount: refundableAmount,
      // TODO: Actual refund creation remains subject to final client policy.
      // For now, we only compute the refundable amount; the admin can create
      // a refund manually via the refund workflow if needed.
    };
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

  /**
   * Prevents duplicate registrations by checking that no non-terminal
   * registration (DRAFT, PROCESSING, READY_FOR_TRAVEL) exists for the same
   * traveller + package version. Terminal statuses (COMPLETED, CANCELLED)
   * are excluded so a traveller can re-register for the same package after
   * a previous registration is completed or cancelled.
   */
  private async assertNoActiveRegistrationForPackage(
    travellerId: string,
    packageVersionId: string,
  ) {
    const [draft, processing, ready] = await Promise.all([
      this.getRegistrationStatus('DRAFT'),
      this.getRegistrationStatus('PROCESSING'),
      this.getRegistrationStatus('READY_FOR_TRAVEL'),
    ]);

    const activeStatusIds = [draft.id, processing.id, ready.id];

    const [existing] = await this.db
      .select({
        id: schema.registrations.id,
        registration_number: schema.registrations.registration_number,
        status_code: schema.registrationStatuses.status_code,
      })
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
          eq(schema.registrations.traveller_id, travellerId),
          eq(schema.registrations.package_version_id, packageVersionId),
          eq(schema.registrations.is_deleted, false),
          sql`${schema.registrations.registration_status_id} IN (${sql.join(
            activeStatusIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `Traveller already has an active registration (${existing.registration_number}, status: ${existing.status_code}) for this package version. Resume or cancel it before creating a new one.`,
      );
    }
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
      status: row.registration_statuses?.status_code ?? '',
      status_name: row.registration_statuses?.name ?? '',
      traveller: row.travellers
        ? {
            id: row.travellers.id,
            first_name: row.travellers.first_name,
            middle_name: row.travellers.middle_name,
            last_name: row.travellers.last_name,
            full_name:
              `${row.travellers.first_name} ${row.travellers.middle_name ?? ''} ${row.travellers.last_name}`
                .trim()
                .replace(/\s+/g, ' '),
            traveller_number: row.travellers.traveller_number,
            phone_number: row.travellers.phone_number,
            country: row.countries
              ? { id: row.countries.id, name: row.countries.name }
              : null,
            status: row.traveller_statuses
              ? {
                  id: row.traveller_statuses.id,
                  name: row.traveller_statuses.name,
                }
              : null,
          }
        : null,
      package_version: row.package_versions
        ? {
            id: row.package_versions.id,
            package_version_code: row.package_versions.package_version_code,
            version_name: row.package_versions.version_name,
          }
        : null,
      package_template: row.package_templates
        ? { id: row.package_templates.id, name: row.package_templates.name }
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
      status: row.registration_statuses?.status_code,
      status_name: row.registration_statuses?.name,
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
            status: row.traveller_statuses
              ? {
                  id: row.traveller_statuses.id,
                  name: row.traveller_statuses.name,
                }
              : null,
          }
        : null,
      package_version: row.package_versions
        ? {
            id: row.package_versions.id,
            package_version_code: row.package_versions.package_version_code,
            version_name: row.package_versions.version_name,
            departure_date: row.package_versions.departure_date,
            return_date: row.package_versions.return_date,
            max_capacity: row.package_versions.max_capacity,
            status: row.package_version_statuses?.status_code,
          }
        : null,
      package_template: row.package_templates
        ? { id: row.package_templates.id, name: row.package_templates.name }
        : null,
      currency: row.currencies
        ? {
            id: row.currencies.id,
            code: row.currencies.currency_code,
            name: row.currencies.name,
          }
        : null,
      currency_code: row.currencies?.currency_code ?? null,
      base_price: row.package_versions.base_price,
      primary_contact: row.contact_persons
        ? {
            id: row.contact_persons.id,
            first_name: row.contact_persons.first_name,
            middle_name: row.contact_persons.middle_name,
            last_name: row.contact_persons.last_name,
            name: `${row.contact_persons.first_name} ${row.contact_persons.middle_name ?? ''} ${row.contact_persons.last_name}`
              .trim()
              .replace(/\s+/g, ' '),
            phone_number: row.contact_persons.phone_number,
          }
        : null,
      season: row.seasons
        ? { id: row.seasons.id, name: row.seasons.name }
        : null,
    };
  }
}
