import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, lt, not, or, sql } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { InvoicesService } from '../../../finance/application/services/invoices.service.js';
import { FinanceExceptionsService } from '../../../finance/application/services/finance-exceptions.service.js';

const REQUIRED_DOCUMENT_TYPE_CODES = ['PASSPORT', 'PHOTO'] as const;

@Injectable()
export class RegistrationReadinessService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly invoices: InvoicesService,
    private readonly financeExceptions: FinanceExceptionsService,
  ) {}

  /**
   * Intake completion check for DRAFT -> PROCESSING.
   *
   * Conditions the repository can currently represent:
   * - package version is PUBLISHED
   * - traveller has an active primary contact
   * - traveller has verified, valid, non-expired PASSPORT and PHOTO documents
   * - at least one non-CANCELLED invoice exists and the outstanding balance <= 0
   */
  async isRegistrationComplete(registrationId: string): Promise<boolean> {
    const [registration] = await this.db
      .select({
        id: schema.registrations.id,
        traveller_id: schema.registrations.traveller_id,
      })
      .from(schema.registrations)
      .where(
        and(
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);

    if (!registration) return false;

    const [pkg] = await this.db
      .select({ status: schema.packageVersionStatuses.status_code })
      .from(schema.registrations)
      .innerJoin(
        schema.packageVersions,
        eq(schema.registrations.package_version_id, schema.packageVersions.id),
      )
      .innerJoin(
        schema.packageVersionStatuses,
        eq(
          schema.packageVersions.package_version_status_id,
          schema.packageVersionStatuses.id,
        ),
      )
      .where(eq(schema.registrations.id, registrationId))
      .limit(1);

    if (!pkg || pkg.status !== 'PUBLISHED') return false;

    const [primaryContact] = await this.db
      .select({ id: schema.travellerContacts.id })
      .from(schema.travellerContacts)
      .innerJoin(
        schema.travellerContactStatuses,
        eq(
          schema.travellerContacts.traveller_contact_status_id,
          schema.travellerContactStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travellerContacts.traveller_id, registration.traveller_id),
          eq(schema.travellerContacts.is_primary_contact, true),
          eq(schema.travellerContacts.is_deleted, false),
          eq(schema.travellerContactStatuses.status_code, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (!primaryContact) return false;

    const docsSatisfied = await this.hasRequiredUploadedDocuments(
      registration.traveller_id,
    );
    if (!docsSatisfied) return false;

    const paymentSatisfied =
      await this.isPaymentRequirementSatisfied(registrationId);
    if (!paymentSatisfied) return false;

    const hasGuarantee = await this.hasActiveGuarantee(registrationId);
    if (!hasGuarantee) return false;

    return true;
  }

  /**
   * Readiness check for PROCESSING -> READY_FOR_TRAVEL.
   *
   * Conditions the repository can currently represent:
   * - registration is PROCESSING
   * - payment outstanding balance <= 0 (Finance remains the source of truth)
   * - required documents still verified, valid, and non-expired
   * - at least one approved visa application for the registration
   * - at least one confirmed flight booking for the registration
   */
  async isReadyForTravel(registrationId: string): Promise<boolean> {
    const [registration] = await this.db
      .select({
        id: schema.registrations.id,
        status: schema.registrationStatuses.status_code,
        traveller_id: schema.registrations.traveller_id,
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
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);

    if (!registration || registration.status !== 'PROCESSING') return false;

    const balance =
      await this.invoices.getOutstandingBalanceForRegistration(registrationId);

    // If there is an outstanding balance, check whether an authorized
    // credit exception covers it. The exception does not modify the
    // balance; it only satisfies the readiness gate.
    let paymentOk = balance <= 0;
    if (!paymentOk && balance > 0) {
      const exception =
        await this.financeExceptions.getActiveExceptionForRegistration(
          registrationId,
        );
      if (exception && exception.authorized_amount >= balance) {
        paymentOk = true;
      }
    }

    const [docsOk, visaOk, flightOk] = await Promise.all([
      this.hasRequiredUploadedDocuments(registration.traveller_id),
      this.hasApprovedVisa(registrationId),
      this.hasConfirmedFlight(registrationId),
    ]);

    return paymentOk && docsOk && visaOk && flightOk;
  }

  private async hasRequiredUploadedDocuments(
    travellerId: string,
  ): Promise<boolean> {
    const validDocs = await this.db
      .select({
        type_code: schema.documentTypes.type_code,
      })
      .from(schema.documents)
      .innerJoin(
        schema.documentTypes,
        eq(schema.documents.document_type_id, schema.documentTypes.id),
      )
      .innerJoin(
        schema.documentStatuses,
        eq(schema.documents.document_status_id, schema.documentStatuses.id),
      )
      .where(
        and(
          eq(schema.documents.traveller_id, travellerId),
          eq(schema.documents.is_deleted, false),
          inArray(schema.documentTypes.type_code, [
            ...REQUIRED_DOCUMENT_TYPE_CODES,
          ]),
          not(
            inArray(schema.documentStatuses.status_code, [
              'REJECTED',
              'EXPIRED',
            ]),
          ),
          or(
            isNull(schema.documents.expiry_date),
            gte(schema.documents.expiry_date, sql`CURRENT_DATE`),
          ),
        ),
      );

    const foundTypes = new Set(validDocs.map((d) => d.type_code));
    return REQUIRED_DOCUMENT_TYPE_CODES.every((code) => foundTypes.has(code));
  }

  private async hasApprovedVisa(registrationId: string): Promise<boolean> {
    const [visa] = await this.db
      .select({ id: schema.visaApplications.id })
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
      )
      .limit(1);

    return !!visa;
  }

  private async hasConfirmedFlight(registrationId: string): Promise<boolean> {
    const [flight] = await this.db
      .select({ id: schema.flightBookings.id })
      .from(schema.flightBookings)
      .innerJoin(
        schema.flightBookingStatuses,
        eq(
          schema.flightBookings.flight_booking_status_id,
          schema.flightBookingStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.flightBookings.registration_id, registrationId),
          eq(schema.flightBookings.is_deleted, false),
          eq(schema.flightBookingStatuses.status_code, 'CONFIRMED'),
        ),
      )
      .limit(1);

    return !!flight;
  }

  private async isPaymentRequirementSatisfied(
    registrationId: string,
  ): Promise<boolean> {
    const [invoiceCount] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.invoices)
      .innerJoin(
        schema.invoiceStatuses,
        eq(schema.invoices.invoice_status_id, schema.invoiceStatuses.id),
      )
      .where(
        and(
          eq(schema.invoices.registration_id, registrationId),
          eq(schema.invoices.is_deleted, false),
          not(eq(schema.invoiceStatuses.status_code, 'CANCELLED')),
        ),
      );

    if (!invoiceCount || invoiceCount.count === 0) return false;

    const balance =
      await this.invoices.getOutstandingBalanceForRegistration(registrationId);
    return balance <= 0;
  }

  private async hasActiveGuarantee(registrationId: string): Promise<boolean> {
    const [guarantee] = await this.db
      .select({ id: schema.guarantees.id })
      .from(schema.guarantees)
      .where(
        and(
          eq(schema.guarantees.registration_id, registrationId),
          eq(schema.guarantees.is_deleted, false),
          eq(schema.guarantees.guarantee_status, 'ACTIVE'),
        ),
      )
      .limit(1);
    return !!guarantee;
  }

  /**
   * Returns the computed readiness conditions for a single registration.
   *
   * This is a read-only projection used by the registration operational
   * summary and the "blocked from ready" queue.
   */
  async getReadinessDetails(registrationId: string) {
    const [registration] = await this.db
      .select({
        id: schema.registrations.id,
        status: schema.registrationStatuses.status_code,
        traveller_id: schema.registrations.traveller_id,
        package_version_id: schema.registrations.package_version_id,
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
          eq(schema.registrations.id, registrationId),
          eq(schema.registrations.is_deleted, false),
        ),
      )
      .limit(1);

    if (!registration) {
      return null;
    }

    const [pkg] = await this.db
      .select({ status: schema.packageVersionStatuses.status_code })
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
          eq(schema.packageVersions.id, registration.package_version_id),
          eq(schema.packageVersions.is_deleted, false),
        ),
      )
      .limit(1);

    const [primaryContact] = await this.db
      .select({ id: schema.travellerContacts.id })
      .from(schema.travellerContacts)
      .innerJoin(
        schema.travellerContactStatuses,
        eq(
          schema.travellerContacts.traveller_contact_status_id,
          schema.travellerContactStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.travellerContacts.traveller_id, registration.traveller_id),
          eq(schema.travellerContacts.is_primary_contact, true),
          eq(schema.travellerContacts.is_deleted, false),
          eq(schema.travellerContactStatuses.status_code, 'ACTIVE'),
        ),
      )
      .limit(1);

    const docsUploaded = await this.hasRequiredUploadedDocuments(
      registration.traveller_id,
    );
    const visaSatisfied = await this.hasApprovedVisa(registration.id);
    const flightSatisfied = await this.hasConfirmedFlight(registration.id);
    const finance = await this.invoices.getRegistrationFinanceSummaries([
      registration.id,
    ]);
    const summary = finance.get(registration.id) ?? {
      total_invoiced: 0,
      total_paid: 0,
      outstanding_balance: 0,
    };

    // Check for authorized credit exception
    const creditException =
      await this.financeExceptions.getActiveExceptionForRegistration(
        registration.id,
      );
    const authorizedCredit = creditException?.authorized_amount ?? 0;
    const hasAuthorizedCredit = authorizedCredit > 0;

    const packagePublished = pkg?.status === 'PUBLISHED';
    const hasPrimaryContact = !!primaryContact;
    const hasPaymentForIntake =
      summary.total_invoiced > 0 && summary.outstanding_balance <= 0;
    // Ready-for-travel payment: either balance is zero, or an authorized
    // credit exception covers the outstanding balance.
    const hasPaymentForReady =
      summary.outstanding_balance <= 0 ||
      (hasAuthorizedCredit && authorizedCredit >= summary.outstanding_balance);
    const hasGuarantee = await this.hasActiveGuarantee(registration.id);

    // Intake (DRAFT -> PROCESSING): documents only need to be uploaded
    const canStartProcessing =
      registration.status === 'DRAFT' &&
      packagePublished &&
      hasPrimaryContact &&
      docsUploaded &&
      hasPaymentForIntake &&
      hasGuarantee;

    // Ready for travel (PROCESSING -> READY_FOR_TRAVEL): payment, documents, visa, flight
    const canConfirmReady =
      registration.status === 'PROCESSING' &&
      hasPaymentForReady &&
      docsUploaded &&
      visaSatisfied &&
      flightSatisfied;

    const blockers: string[] = [];
    if (registration.status === 'DRAFT') {
      if (!packagePublished) blockers.push('PACKAGE_NOT_PUBLISHED');
      if (!hasPrimaryContact) blockers.push('NO_PRIMARY_CONTACT');
      if (!docsUploaded) blockers.push('MISSING_REQUIRED_DOCUMENTS');
      if (!hasPaymentForIntake) blockers.push('UNPAID_OR_MISSING_INVOICE');
      if (!hasGuarantee) blockers.push('MISSING_GUARANTEE');
    } else if (registration.status === 'PROCESSING') {
      if (!hasPaymentForReady) blockers.push('OUTSTANDING_BALANCE');
      if (!visaSatisfied) blockers.push('VISA_NOT_APPROVED');
      if (!flightSatisfied) blockers.push('FLIGHT_NOT_CONFIRMED');
    }

    return {
      registration_id: registration.id,
      status: registration.status,
      package_published: packagePublished,
      has_primary_contact: hasPrimaryContact,
      required_documents_verified: docsUploaded,
      visa_approved: visaSatisfied,
      flight_confirmed: flightSatisfied,
      payment_satisfied: hasPaymentForReady,
      intake_payment_satisfied: hasPaymentForIntake,
      has_guarantee: hasGuarantee,
      has_authorized_credit: hasAuthorizedCredit,
      authorized_credit_amount: authorizedCredit,
      outstanding_balance: summary.outstanding_balance,
      can_start_processing: canStartProcessing,
      can_confirm_ready: canConfirmReady,
      ready_for_travel: canConfirmReady,
      blockers,
    };
  }

  /**
   * Batch version of `getReadinessDetails`.
   *
   * @returns A map of registration_id -> readiness details. Missing
   * registrations are omitted from the map.
   */
  async getReadinessDetailsForRegistrations(registrationIds: string[]) {
    const result = new Map<
      string,
      Awaited<ReturnType<typeof this.getReadinessDetails>>
    >();

    if (registrationIds.length === 0) {
      return result;
    }

    const registrations = await this.db
      .select({
        id: schema.registrations.id,
        status: schema.registrationStatuses.status_code,
        traveller_id: schema.registrations.traveller_id,
        package_version_id: schema.registrations.package_version_id,
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
          inArray(schema.registrations.id, registrationIds),
          eq(schema.registrations.is_deleted, false),
        ),
      );

    if (registrations.length === 0) {
      return result;
    }

    const packageVersionIds = [
      ...new Set(registrations.map((r) => r.package_version_id)),
    ];
    const travellerIds = [...new Set(registrations.map((r) => r.traveller_id))];
    const registrationIdsValid = registrations.map((r) => r.id);

    const packageStatuses = await this.db
      .select({
        id: schema.packageVersions.id,
        status: schema.packageVersionStatuses.status_code,
      })
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
          inArray(schema.packageVersions.id, packageVersionIds),
          eq(schema.packageVersions.is_deleted, false),
        ),
      );

    const packageStatusById = new Map(
      packageStatuses.map((p) => [p.id, p.status]),
    );

    const primaryContacts = await this.db
      .select({ traveller_id: schema.travellerContacts.traveller_id })
      .from(schema.travellerContacts)
      .innerJoin(
        schema.travellerContactStatuses,
        eq(
          schema.travellerContacts.traveller_contact_status_id,
          schema.travellerContactStatuses.id,
        ),
      )
      .where(
        and(
          inArray(schema.travellerContacts.traveller_id, travellerIds),
          eq(schema.travellerContacts.is_primary_contact, true),
          eq(schema.travellerContacts.is_deleted, false),
          eq(schema.travellerContactStatuses.status_code, 'ACTIVE'),
        ),
      );

    const primaryContactTravellers = new Set(
      primaryContacts.map((c) => c.traveller_id),
    );

    const docsByTraveller = new Map<string, Set<string>>();
    if (travellerIds.length > 0) {
      const docRows = await this.db
        .select({
          traveller_id: schema.documents.traveller_id,
          type_code: schema.documentTypes.type_code,
        })
        .from(schema.documents)
        .innerJoin(
          schema.documentTypes,
          eq(schema.documents.document_type_id, schema.documentTypes.id),
        )
        .innerJoin(
          schema.documentStatuses,
          eq(schema.documents.document_status_id, schema.documentStatuses.id),
        )
        .where(
          and(
            inArray(schema.documents.traveller_id, travellerIds),
            eq(schema.documents.is_deleted, false),
            inArray(schema.documentTypes.type_code, [
              ...REQUIRED_DOCUMENT_TYPE_CODES,
            ]),
            not(
              inArray(schema.documentStatuses.status_code, [
                'REJECTED',
                'EXPIRED',
              ]),
            ),
            or(
              isNull(schema.documents.expiry_date),
              gte(schema.documents.expiry_date, sql`CURRENT_DATE`),
            ),
          ),
        );

      for (const row of docRows) {
        if (!row.traveller_id) continue;
        const set = docsByTraveller.get(row.traveller_id) ?? new Set<string>();
        set.add(row.type_code);
        docsByTraveller.set(row.traveller_id, set);
      }
    }

    const approvedVisas = new Set<string>();
    const visaRows = await this.db
      .select({ registration_id: schema.visaApplications.registration_id })
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
          inArray(
            schema.visaApplications.registration_id,
            registrationIdsValid,
          ),
          eq(schema.visaApplications.is_deleted, false),
          eq(schema.visaApplicationStatuses.status_code, 'APPROVED'),
        ),
      );
    for (const row of visaRows) {
      approvedVisas.add(row.registration_id);
    }

    const activeGuarantees = await this.db
      .select({ registration_id: schema.guarantees.registration_id })
      .from(schema.guarantees)
      .where(
        and(
          inArray(schema.guarantees.registration_id, registrationIdsValid),
          eq(schema.guarantees.is_deleted, false),
          eq(schema.guarantees.guarantee_status, 'ACTIVE'),
        ),
      );
    const guaranteedRegistrations = new Set(
      activeGuarantees.map((g) => g.registration_id),
    );

    const confirmedFlights = new Set<string>();
    const flightRows = await this.db
      .select({
        registration_id: schema.flightBookings.registration_id,
      })
      .from(schema.flightBookings)
      .innerJoin(
        schema.flightBookingStatuses,
        eq(
          schema.flightBookings.flight_booking_status_id,
          schema.flightBookingStatuses.id,
        ),
      )
      .where(
        and(
          inArray(schema.flightBookings.registration_id, registrationIdsValid),
          eq(schema.flightBookings.is_deleted, false),
          eq(schema.flightBookingStatuses.status_code, 'CONFIRMED'),
        ),
      );
    for (const row of flightRows) {
      confirmedFlights.add(row.registration_id);
    }

    const finance =
      await this.invoices.getRegistrationFinanceSummaries(registrationIdsValid);

    for (const registration of registrations) {
      const packagePublished =
        packageStatusById.get(registration.package_version_id) === 'PUBLISHED';
      const hasPrimaryContact = primaryContactTravellers.has(
        registration.traveller_id,
      );
      const docsUploaded =
        REQUIRED_DOCUMENT_TYPE_CODES.every((code) =>
          docsByTraveller.get(registration.traveller_id)?.has(code),
        ) ?? false;
      const visaSatisfied = approvedVisas.has(registration.id);
      const flightSatisfied = confirmedFlights.has(registration.id);
      const summary = finance.get(registration.id) ?? {
        total_invoiced: 0,
        total_paid: 0,
        outstanding_balance: 0,
      };

      const hasPaymentForIntake =
        summary.total_invoiced > 0 && summary.outstanding_balance <= 0;
      const hasPaymentForReady = summary.outstanding_balance <= 0;
      const hasGuarantee = guaranteedRegistrations.has(registration.id);

      // Intake (DRAFT -> PROCESSING): documents only need to be uploaded
      const canStartProcessing =
        registration.status === 'DRAFT' &&
        packagePublished &&
        hasPrimaryContact &&
        docsUploaded &&
        hasPaymentForIntake &&
        hasGuarantee;

      // Ready for travel (PROCESSING -> READY_FOR_TRAVEL): payment, documents, visa, flight
      const canConfirmReady =
        registration.status === 'PROCESSING' &&
        hasPaymentForReady &&
        docsUploaded &&
        visaSatisfied &&
        flightSatisfied;

      const blockers: string[] = [];
      if (registration.status === 'DRAFT') {
        if (!packagePublished) blockers.push('PACKAGE_NOT_PUBLISHED');
        if (!hasPrimaryContact) blockers.push('NO_PRIMARY_CONTACT');
        if (!docsUploaded) blockers.push('MISSING_REQUIRED_DOCUMENTS');
        if (!hasPaymentForIntake) blockers.push('UNPAID_OR_MISSING_INVOICE');
        if (!hasGuarantee) blockers.push('MISSING_GUARANTEE');
      } else if (registration.status === 'PROCESSING') {
        if (!hasPaymentForReady) blockers.push('OUTSTANDING_BALANCE');
        if (!visaSatisfied) blockers.push('VISA_NOT_APPROVED');
        if (!flightSatisfied) blockers.push('FLIGHT_NOT_CONFIRMED');
      }

      result.set(registration.id, {
        registration_id: registration.id,
        status: registration.status,
        package_published: packagePublished,
        has_primary_contact: hasPrimaryContact,
        required_documents_verified: docsUploaded,
        visa_approved: visaSatisfied,
        flight_confirmed: flightSatisfied,
        payment_satisfied: hasPaymentForReady,
        intake_payment_satisfied: hasPaymentForIntake,
        has_guarantee: hasGuarantee,
        has_authorized_credit: false,
        authorized_credit_amount: 0,
        outstanding_balance: summary.outstanding_balance,
        can_start_processing: canStartProcessing,
        can_confirm_ready: canConfirmReady,
        ready_for_travel: canConfirmReady,
        blockers,
      });
    }

    return result;
  }
}
