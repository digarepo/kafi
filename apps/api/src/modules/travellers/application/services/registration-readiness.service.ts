import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, isNull, lt, not, or, sql } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import { InvoicesService } from '../../../finance/application/services/invoices.service.js';

const REQUIRED_DOCUMENT_TYPE_CODES = ['PASSPORT', 'PHOTO'] as const;

@Injectable()
export class RegistrationReadinessService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly invoices: InvoicesService,
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

    const docsSatisfied = await this.hasRequiredVerifiedDocuments(
      registration.traveller_id,
    );
    if (!docsSatisfied) return false;

    const paymentSatisfied =
      await this.isPaymentRequirementSatisfied(registrationId);
    if (!paymentSatisfied) return false;

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

    const [paymentOk, docsOk, visaOk] = await Promise.all([
      Promise.resolve(balance <= 0),
      this.hasRequiredVerifiedDocuments(registration.traveller_id),
      this.hasApprovedVisa(registrationId),
    ]);

    return paymentOk && docsOk && visaOk;
  }

  private async hasRequiredVerifiedDocuments(
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
        schema.verificationStatuses,
        eq(
          schema.documents.verification_status_id,
          schema.verificationStatuses.id,
        ),
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
          eq(schema.verificationStatuses.status_code, 'VERIFIED'),
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

    const docsSatisfied = await this.hasRequiredVerifiedDocuments(
      registration.traveller_id,
    );
    const visaSatisfied = await this.hasApprovedVisa(registration.id);
    const finance = await this.invoices.getRegistrationFinanceSummaries([
      registration.id,
    ]);
    const summary = finance.get(registration.id) ?? {
      total_invoiced: 0,
      total_paid: 0,
      outstanding_balance: 0,
    };

    const packagePublished = pkg?.status === 'PUBLISHED';
    const hasPrimaryContact = !!primaryContact;
    const hasPaymentForIntake =
      summary.total_invoiced > 0 && summary.outstanding_balance <= 0;
    const hasPaymentForReady = summary.outstanding_balance <= 0;

    const canStartProcessing =
      registration.status === 'DRAFT' &&
      packagePublished &&
      hasPrimaryContact &&
      docsSatisfied &&
      hasPaymentForIntake;

    const canConfirmReady =
      registration.status === 'PROCESSING' &&
      hasPaymentForReady &&
      docsSatisfied &&
      visaSatisfied;

    const blockers: string[] = [];
    if (registration.status === 'DRAFT') {
      if (!packagePublished) blockers.push('PACKAGE_NOT_PUBLISHED');
      if (!hasPrimaryContact) blockers.push('NO_PRIMARY_CONTACT');
      if (!docsSatisfied) blockers.push('MISSING_REQUIRED_DOCUMENTS');
      if (!hasPaymentForIntake) blockers.push('UNPAID_OR_MISSING_INVOICE');
    } else if (registration.status === 'PROCESSING') {
      if (!hasPaymentForReady) blockers.push('OUTSTANDING_BALANCE');
      if (!docsSatisfied) blockers.push('MISSING_REQUIRED_DOCUMENTS');
      if (!visaSatisfied) blockers.push('VISA_NOT_APPROVED');
    }

    return {
      registration_id: registration.id,
      status: registration.status,
      package_published: packagePublished,
      has_primary_contact: hasPrimaryContact,
      required_documents_verified: docsSatisfied,
      visa_approved: visaSatisfied,
      payment_satisfied: hasPaymentForReady,
      intake_payment_satisfied: hasPaymentForIntake,
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
          schema.verificationStatuses,
          eq(
            schema.documents.verification_status_id,
            schema.verificationStatuses.id,
          ),
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
            eq(schema.verificationStatuses.status_code, 'VERIFIED'),
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

    const finance =
      await this.invoices.getRegistrationFinanceSummaries(registrationIdsValid);

    for (const registration of registrations) {
      const packagePublished =
        packageStatusById.get(registration.package_version_id) === 'PUBLISHED';
      const hasPrimaryContact = primaryContactTravellers.has(
        registration.traveller_id,
      );
      const docsSatisfied =
        REQUIRED_DOCUMENT_TYPE_CODES.every((code) =>
          docsByTraveller.get(registration.traveller_id)?.has(code),
        ) ?? false;
      const visaSatisfied = approvedVisas.has(registration.id);
      const summary = finance.get(registration.id) ?? {
        total_invoiced: 0,
        total_paid: 0,
        outstanding_balance: 0,
      };

      const hasPaymentForIntake =
        summary.total_invoiced > 0 && summary.outstanding_balance <= 0;
      const hasPaymentForReady = summary.outstanding_balance <= 0;

      const canStartProcessing =
        registration.status === 'DRAFT' &&
        packagePublished &&
        hasPrimaryContact &&
        docsSatisfied &&
        hasPaymentForIntake;

      const canConfirmReady =
        registration.status === 'PROCESSING' &&
        hasPaymentForReady &&
        docsSatisfied &&
        visaSatisfied;

      const blockers: string[] = [];
      if (registration.status === 'DRAFT') {
        if (!packagePublished) blockers.push('PACKAGE_NOT_PUBLISHED');
        if (!hasPrimaryContact) blockers.push('NO_PRIMARY_CONTACT');
        if (!docsSatisfied) blockers.push('MISSING_REQUIRED_DOCUMENTS');
        if (!hasPaymentForIntake) blockers.push('UNPAID_OR_MISSING_INVOICE');
      } else if (registration.status === 'PROCESSING') {
        if (!hasPaymentForReady) blockers.push('OUTSTANDING_BALANCE');
        if (!docsSatisfied) blockers.push('MISSING_REQUIRED_DOCUMENTS');
        if (!visaSatisfied) blockers.push('VISA_NOT_APPROVED');
      }

      result.set(registration.id, {
        registration_id: registration.id,
        status: registration.status,
        package_published: packagePublished,
        has_primary_contact: hasPrimaryContact,
        required_documents_verified: docsSatisfied,
        visa_approved: visaSatisfied,
        payment_satisfied: hasPaymentForReady,
        intake_payment_satisfied: hasPaymentForIntake,
        can_start_processing: canStartProcessing,
        can_confirm_ready: canConfirmReady,
        ready_for_travel: canConfirmReady,
        blockers,
      });
    }

    return result;
  }
}
