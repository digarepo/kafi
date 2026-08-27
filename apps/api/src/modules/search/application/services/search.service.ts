import { Inject, Injectable } from '@nestjs/common';
import { and, eq, like, or } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import type { AuthenticatedUser } from '../../../../shared/kernel/principal.js';
import * as schema from '@kafi/database';

/**
 * Maximum number of matches returned per entity group.
 *
 * Kept small so the response stays light and the popover renders quickly.
 */
const PER_ENTITY_LIMIT = 5;

/**
 * Minimum query length before any search is performed.
 *
 * Short queries (e.g. a single character) produce noisy `LIKE %x%` scans, so
 * the service short-circuits and returns an empty result set.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * A single search hit shown in the global search popover.
 */
export interface SearchHit {
  id: string;
  /** Primary label — the most identifying field for the entity. */
  label: string;
  /** Secondary line — contextual detail shown beneath the label. */
  secondary: string | null;
  /** Admin route path to the entity's detail page. */
  href: string;
}

/**
 * Grouped search response consumed by the admin command palette.
 */
export interface SearchResults {
  query: string;
  travellers: SearchHit[];
  registrations: SearchHit[];
  travel_groups: SearchHit[];
  inquiries: SearchHit[];
  packages: SearchHit[];
  invoices: SearchHit[];
  payments: SearchHit[];
}

const EMPTY_RESULTS = (query: string): SearchResults => ({
  query,
  travellers: [],
  registrations: [],
  travel_groups: [],
  inquiries: [],
  packages: [],
  invoices: [],
  payments: [],
});

/**
 * Cross-entity operational search.
 *
 * Runs lightweight `LIKE` queries across the core operational entities in
 * parallel, returning a small number of matches per entity. Each entity group
 * is only queried when the caller has the corresponding view permission, so
 * unauthorized records are never exposed — not even as counts.
 */
@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async search(
    rawQuery: string,
    user: AuthenticatedUser,
  ): Promise<SearchResults> {
    const query = rawQuery.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      return EMPTY_RESULTS(query);
    }

    const term = `%${query}%`;
    const perms = new Set(user.permissions);

    const [
      travellers,
      registrations,
      travelGroups,
      inquiries,
      packages,
      invoices,
      payments,
    ] = await Promise.all([
      perms.has('TRAVELLER_VIEW')
        ? this.searchTravellers(term)
        : Promise.resolve([]),
      perms.has('REGISTRATION_VIEW')
        ? this.searchRegistrations(term)
        : Promise.resolve([]),
      perms.has('TRAVEL_GROUP_VIEW')
        ? this.searchTravelGroups(term)
        : Promise.resolve([]),
      perms.has('INQUIRY_VIEW')
        ? this.searchInquiries(term)
        : Promise.resolve([]),
      perms.has('PACKAGE_VIEW')
        ? this.searchPackages(term)
        : Promise.resolve([]),
      perms.has('FINANCE_VIEW')
        ? this.searchInvoices(term)
        : Promise.resolve([]),
      perms.has('FINANCE_VIEW')
        ? this.searchPayments(term)
        : Promise.resolve([]),
    ]);

    return {
      query,
      travellers,
      registrations,
      travel_groups: travelGroups,
      inquiries,
      packages,
      invoices,
      payments,
    };
  }

  private async searchTravellers(term: string): Promise<SearchHit[]> {
    const rows = await this.db
      .select({
        id: schema.travellers.id,
        first_name: schema.travellers.first_name,
        last_name: schema.travellers.last_name,
        traveller_number: schema.travellers.traveller_number,
        phone_number: schema.travellers.phone_number,
      })
      .from(schema.travellers)
      .where(
        and(
          eq(schema.travellers.is_deleted, false),
          or(
            like(schema.travellers.first_name, term),
            like(schema.travellers.last_name, term),
            like(schema.travellers.phone_number, term),
            like(schema.travellers.traveller_number, term),
            like(schema.travellers.passport_number, term),
            like(schema.travellers.fayda_number, term),
          ),
        ),
      )
      .limit(PER_ENTITY_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      label: `${r.first_name} ${r.last_name}`.trim(),
      secondary: r.traveller_number,
      href: `/travellers/${r.id}`,
    }));
  }

  private async searchRegistrations(term: string): Promise<SearchHit[]> {
    const rows = await this.db
      .select({
        id: schema.registrations.id,
        registration_number: schema.registrations.registration_number,
        first_name: schema.travellers.first_name,
        last_name: schema.travellers.last_name,
      })
      .from(schema.registrations)
      .innerJoin(
        schema.travellers,
        eq(schema.registrations.traveller_id, schema.travellers.id),
      )
      .where(
        and(
          eq(schema.registrations.is_deleted, false),
          or(
            like(schema.registrations.registration_number, term),
            like(schema.travellers.first_name, term),
            like(schema.travellers.last_name, term),
          ),
        ),
      )
      .limit(PER_ENTITY_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      label: r.registration_number,
      secondary: `${r.first_name} ${r.last_name}`.trim(),
      href: `/registrations/${r.id}`,
    }));
  }

  private async searchTravelGroups(term: string): Promise<SearchHit[]> {
    const rows = await this.db
      .select({
        id: schema.travelGroups.id,
        name: schema.travelGroups.name,
        group_number: schema.travelGroups.group_number,
      })
      .from(schema.travelGroups)
      .where(
        and(
          eq(schema.travelGroups.is_deleted, false),
          or(
            like(schema.travelGroups.name, term),
            like(schema.travelGroups.group_number, term),
          ),
        ),
      )
      .limit(PER_ENTITY_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      label: r.name,
      secondary: r.group_number,
      href: `/travel-groups/${r.id}`,
    }));
  }

  private async searchInquiries(term: string): Promise<SearchHit[]> {
    const rows = await this.db
      .select({
        id: schema.inquiries.id,
        inquiry_number: schema.inquiries.inquiry_number,
        full_name: schema.inquiries.full_name,
        phone_number: schema.inquiries.phone_number,
        email_address: schema.inquiries.email_address,
      })
      .from(schema.inquiries)
      .where(
        and(
          eq(schema.inquiries.is_deleted, false),
          or(
            like(schema.inquiries.inquiry_number, term),
            like(schema.inquiries.full_name, term),
            like(schema.inquiries.phone_number, term),
            like(schema.inquiries.email_address, term),
          ),
        ),
      )
      .limit(PER_ENTITY_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      label: r.inquiry_number,
      secondary: r.full_name ?? r.phone_number,
      href: `/inquiries/${r.id}`,
    }));
  }

  private async searchPackages(term: string): Promise<SearchHit[]> {
    const [templates, versions] = await Promise.all([
      this.db
        .select({
          id: schema.packageTemplates.id,
          name: schema.packageTemplates.name,
          code: schema.packageTemplates.package_template_code,
        })
        .from(schema.packageTemplates)
        .where(
          and(
            eq(schema.packageTemplates.is_deleted, false),
            or(
              like(schema.packageTemplates.name, term),
              like(schema.packageTemplates.package_template_code, term),
            ),
          ),
        )
        .limit(PER_ENTITY_LIMIT),
      this.db
        .select({
          id: schema.packageVersions.id,
          version_name: schema.packageVersions.version_name,
          code: schema.packageVersions.package_version_code,
        })
        .from(schema.packageVersions)
        .where(
          and(
            eq(schema.packageVersions.is_deleted, false),
            or(
              like(schema.packageVersions.version_name, term),
              like(schema.packageVersions.package_version_code, term),
            ),
          ),
        )
        .limit(PER_ENTITY_LIMIT),
    ]);

    const hits: SearchHit[] = [
      ...templates.map((t) => ({
        id: t.id,
        label: t.name,
        secondary: t.code,
        href: `/packages/${t.id}`,
      })),
      ...versions.map((v) => ({
        id: v.id,
        label: v.version_name,
        secondary: v.code,
        href: `/packages/versions/${v.id}`,
      })),
    ];

    return hits.slice(0, PER_ENTITY_LIMIT);
  }

  private async searchInvoices(term: string): Promise<SearchHit[]> {
    const rows = await this.db
      .select({
        id: schema.invoices.id,
        invoice_number: schema.invoices.invoice_number,
        registration_number: schema.registrations.registration_number,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.registrations,
        eq(schema.invoices.registration_id, schema.registrations.id),
      )
      .where(
        and(
          eq(schema.invoices.is_deleted, false),
          or(
            like(schema.invoices.invoice_number, term),
            like(schema.registrations.registration_number, term),
          ),
        ),
      )
      .limit(PER_ENTITY_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      label: r.invoice_number,
      secondary: r.registration_number,
      href: `/invoices/${r.id}`,
    }));
  }

  private async searchPayments(term: string): Promise<SearchHit[]> {
    const rows = await this.db
      .select({
        id: schema.payments.id,
        payment_number: schema.payments.payment_number,
        reference_number: schema.payments.reference_number,
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.is_deleted, false),
          or(
            like(schema.payments.payment_number, term),
            like(schema.payments.reference_number, term),
          ),
        ),
      )
      .limit(PER_ENTITY_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      label: r.payment_number,
      secondary: r.reference_number,
      href: `/payments/${r.id}`,
    }));
  }
}
