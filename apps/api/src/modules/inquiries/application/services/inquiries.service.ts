import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import * as schema from '@kafi/database';

import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import { Mailer } from '../../../iam/application/ports/mailer.port.js';
import { AnalyticsEventsService } from '../../../analytics/application/services/analytics-events.service.js';
import {
  createInquiryCreatedEvent,
  INQUIRY_CREATED,
} from '../../domain/events/inquiry-created.event.js';
import type {
  ChangeInquiryStatusInput,
  InquiryFilters,
  PublicBookingInquiryInput,
  PublicCallbackInquiryInput,
  PublicContactInquiryInput,
  PublicEnquiryInquiryInput,
  UpdateInquiryInput,
} from '../dto/inquiries.dto.js';

/** Inquiry lifecycle states. */
export type InquiryStatus = 'NEW' | 'CONTACTED' | 'RESOLVED';

/** Which public form produced an inquiry. */
export type InquiryType = 'BOOKING' | 'CALLBACK' | 'CONTACT' | 'ENQUIRY';

/**
 * Forward-only status transitions.
 *
 * `NEW -> RESOLVED` is permitted because many inquiries are resolved on the
 * first call. `RESOLVED` is terminal; reopening is out of scope for the MVP.
 */
const ALLOWED_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ['CONTACTED', 'RESOLVED'],
  CONTACTED: ['RESOLVED'],
  RESOLVED: [],
};

/** Request-derived metadata captured server-side, never trusted from the body. */
export interface PublicRequestContext {
  userAgent?: string;
}

/**
 * Normalises blank optional text to `null`.
 *
 * The public forms submit `""` for untouched optional fields. The DTOs already
 * transform those away, but normalising here too keeps the stored data clean
 * regardless of the caller, so the inbox never shows an empty-string "value".
 */
function blankToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Public inquiry capture and the staff-facing inbox.
 *
 * All four public form types are persisted into a single `inquiries` table so
 * the inbox has one list query, one lifecycle, and one detail view.
 */
@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
    private readonly numbers: BusinessNumberService,
    private readonly mailer: Mailer,
    private readonly eventEmitter: EventEmitter2,
    private readonly analytics: AnalyticsEventsService,
  ) {}

  // ---- Public capture ----

  async createBookingInquiry(
    dto: PublicBookingInquiryInput,
    ctx: PublicRequestContext,
  ) {
    return this.create(
      {
        inquiry_type: 'BOOKING',
        full_name: dto.fullName,
        phone_number: dto.phone,
        email_address: dto.email ?? null,
        message: dto.message ?? null,
        package_interest: dto.package ?? null,
        travel_period: dto.travelPeriod,
        group_size: dto.numberOfTravellers,
        utm_source: dto.utm_source,
        utm_medium: dto.utm_medium,
        utm_campaign: dto.utm_campaign,
        utm_content: dto.utm_content,
        utm_term: dto.utm_term,
        anonymous_visitor_id: dto.anonymous_visitor_id,
      },
      ctx,
    );
  }

  async createCallbackInquiry(
    dto: PublicCallbackInquiryInput,
    ctx: PublicRequestContext,
  ) {
    return this.create(
      {
        inquiry_type: 'CALLBACK',
        full_name: dto.fullName ?? null,
        phone_number: dto.phone,
        source_channel: dto.source ?? null,
        utm_source: dto.utm_source,
        utm_medium: dto.utm_medium,
        utm_campaign: dto.utm_campaign,
        utm_content: dto.utm_content,
        utm_term: dto.utm_term,
        anonymous_visitor_id: dto.anonymous_visitor_id,
      },
      ctx,
    );
  }

  async createContactInquiry(
    dto: PublicContactInquiryInput,
    ctx: PublicRequestContext,
  ) {
    return this.create(
      {
        inquiry_type: 'CONTACT',
        full_name: dto.fullName,
        phone_number: dto.phone,
        email_address: dto.email,
        message: dto.message,
        enquiry_category: dto.enquiryType,
        package_interest: dto.packageInterest ?? null,
        travel_period: dto.travelPeriod ?? null,
        group_size: dto.groupSize ?? null,
        utm_source: dto.utm_source,
        utm_medium: dto.utm_medium,
        utm_campaign: dto.utm_campaign,
        utm_content: dto.utm_content,
        utm_term: dto.utm_term,
        anonymous_visitor_id: dto.anonymous_visitor_id,
      },
      ctx,
    );
  }

  async createEnquiryInquiry(
    dto: PublicEnquiryInquiryInput,
    ctx: PublicRequestContext,
  ) {
    return this.create(
      {
        inquiry_type: 'ENQUIRY',
        full_name: dto.fullName,
        phone_number: dto.phone,
        email_address: dto.email ?? null,
        message: dto.message,
        package_interest: dto.package ?? null,
        service_interest: dto.service ?? null,
        utm_source: dto.utm_source,
        utm_medium: dto.utm_medium,
        utm_campaign: dto.utm_campaign,
        utm_content: dto.utm_content,
        utm_term: dto.utm_term,
        anonymous_visitor_id: dto.anonymous_visitor_id,
      },
      ctx,
    );
  }

  /**
   * Persists an inquiry then attempts a staff notification.
   *
   * @remarks
   * The notification is attempted only after the row is committed, and any
   * failure is logged rather than propagated: once the inquiry is stored the
   * public request has succeeded, and a mail-provider outage must not turn that
   * into an error for the customer.
   */
  private async create(
    values: {
      inquiry_type: InquiryType;
      full_name?: string | null;
      phone_number: string;
      email_address?: string | null;
      message?: string | null;
      enquiry_category?: string | null;
      package_interest?: string | null;
      service_interest?: string | null;
      travel_period?: string | null;
      group_size?: string | null;
      source_channel?: string | null;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
      anonymous_visitor_id?: string;
    },
    ctx: PublicRequestContext,
  ) {
    const id = ulid();
    const inquiryNumber = await this.numbers.generateInquiryNumber();

    const utmSource = blankToNull(values.utm_source);
    const utmMedium = blankToNull(values.utm_medium);
    const utmCampaign = blankToNull(values.utm_campaign);
    const utmContent = blankToNull(values.utm_content);
    const utmTerm = blankToNull(values.utm_term);
    const visitorId = values.anonymous_visitor_id ?? null;

    await this.db.insert(schema.inquiries).values({
      id,
      inquiry_number: inquiryNumber,
      inquiry_type: values.inquiry_type,
      inquiry_status: 'NEW',
      full_name: blankToNull(values.full_name),
      phone_number: values.phone_number,
      email_address: blankToNull(values.email_address),
      message: blankToNull(values.message),
      enquiry_category: blankToNull(values.enquiry_category),
      package_interest: blankToNull(values.package_interest),
      service_interest: blankToNull(values.service_interest),
      travel_period: blankToNull(values.travel_period),
      group_size: blankToNull(values.group_size),
      source_channel: blankToNull(values.source_channel),
      user_agent: ctx.userAgent?.slice(0, 255) ?? null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      utm_term: utmTerm,
      anonymous_visitor_id: visitorId,
      // Public submissions have no authenticated actor.
      created_by: null,
      updated_by: null,
    });

    await this.notifyStaff(id, inquiryNumber, values);

    // Emit domain event for the inquiry creation. Subscribers (e.g. the
    // analytics conversion recorder) listen on this event. The event payload
    // contains only non-sensitive identifiers and attribution — no PII.
    const event = createInquiryCreatedEvent({
      inquiry_id: id,
      inquiry_number: inquiryNumber,
      inquiry_type: values.inquiry_type,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      anonymous_visitor_id: visitorId,
      created_at: new Date().toISOString(),
    });
    this.eventEmitter.emit(event.type, event);

    return { ok: true as const, inquiry_number: inquiryNumber };
  }

  private async notifyStaff(
    id: string,
    inquiryNumber: string,
    values: {
      inquiry_type: InquiryType;
      full_name?: string | null;
      phone_number: string;
      email_address?: string | null;
      message?: string | null;
      enquiry_category?: string | null;
      package_interest?: string | null;
      service_interest?: string | null;
      travel_period?: string | null;
      group_size?: string | null;
      source_channel?: string | null;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
      anonymous_visitor_id?: string;
    },
  ) {
    const recipients = (process.env['INQUIRY_NOTIFY_EMAILS'] ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      this.logger.warn(
        `INQUIRY_NOTIFY_EMAILS is not configured; skipping notification for ${inquiryNumber}`,
      );
      return;
    }

    try {
      await this.mailer.sendInquiryNotification(recipients, {
        inquiry_id: id,
        inquiry_number: inquiryNumber,
        inquiry_type: values.inquiry_type,
        full_name: blankToNull(values.full_name),
        phone_number: values.phone_number,
        email_address: blankToNull(values.email_address),
        message: blankToNull(values.message),
        enquiry_category: blankToNull(values.enquiry_category),
        package_interest: blankToNull(values.package_interest),
        service_interest: blankToNull(values.service_interest),
        travel_period: blankToNull(values.travel_period),
        group_size: blankToNull(values.group_size),
        source_channel: blankToNull(values.source_channel),
        received_at: new Date(),
      });
    } catch (error) {
      // Never surface provider errors to the public caller.
      this.logger.error(
        `Failed to send inquiry notification for ${inquiryNumber}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // ---- Admin inbox ----

  async listInquiries(filters: InquiryFilters) {
    const conditions = [eq(schema.inquiries.is_deleted, false)];

    if (filters.type) {
      conditions.push(eq(schema.inquiries.inquiry_type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(schema.inquiries.inquiry_status, filters.status));
    }
    if (filters.from) {
      conditions.push(
        gte(schema.inquiries.created_at, new Date(`${filters.from}T00:00:00`)),
      );
    }
    if (filters.to) {
      conditions.push(
        lte(schema.inquiries.created_at, new Date(`${filters.to}T23:59:59`)),
      );
    }
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.inquiries.inquiry_number, term),
          like(schema.inquiries.full_name, term),
          like(schema.inquiries.phone_number, term),
          like(schema.inquiries.email_address, term),
        )!,
      );
    }

    const where = and(...conditions)!;

    const [rows, total] = await Promise.all([
      this.db
        .select()
        .from(schema.inquiries)
        .where(where)
        .orderBy(desc(schema.inquiries.created_at))
        .limit(filters.page_size)
        .offset((filters.page - 1) * filters.page_size),
      // The same conditions are applied to the count so pagination totals
      // match the filtered result set.
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.inquiries)
        .where(where)
        .then((r) => Number(r[0]?.count ?? 0)),
    ]);

    return {
      data: rows.map((row) => this.mapRow(row)),
      total,
      page: filters.page,
      page_size: filters.page_size,
    };
  }

  async getSummary() {
    const rows = await this.db
      .select({
        status: schema.inquiries.inquiry_status,
        count: sql<number>`count(*)`,
      })
      .from(schema.inquiries)
      .where(eq(schema.inquiries.is_deleted, false))
      .groupBy(schema.inquiries.inquiry_status);

    const counts = { new: 0, contacted: 0, resolved: 0 };
    for (const row of rows) {
      const value = Number(row.count ?? 0);
      if (row.status === 'NEW') counts.new = value;
      else if (row.status === 'CONTACTED') counts.contacted = value;
      else if (row.status === 'RESOLVED') counts.resolved = value;
    }

    // Unviewed = NEW inquiries that no staff member has opened yet.
    const [unviewedRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.inquiries)
      .where(
        and(
          eq(schema.inquiries.is_deleted, false),
          eq(schema.inquiries.inquiry_status, 'NEW'),
          sql`${schema.inquiries.first_viewed_at} IS NULL`,
        ),
      );

    return {
      ...counts,
      unviewed: Number(unviewedRow?.count ?? 0),
      total: counts.new + counts.contacted + counts.resolved,
    };
  }

  async getInquiry(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.inquiries)
      .where(eq(schema.inquiries.id, id))
      .limit(1);

    if (!row || row.is_deleted) {
      throw new NotFoundException('Inquiry not found');
    }

    // Mark as viewed the first time any staff member opens the detail.
    // This is a side-effect of reading, but it's the natural signal that
    // the inquiry has been "seen" and the notification badge should clear.
    if (!row.first_viewed_at) {
      await this.db
        .update(schema.inquiries)
        .set({ first_viewed_at: new Date() })
        .where(eq(schema.inquiries.id, id));
    }

    return this.mapRow(row);
  }

  async updateInquiry(id: string, dto: UpdateInquiryInput, actorId: string) {
    await this.getInquiry(id);

    await this.db
      .update(schema.inquiries)
      .set({
        staff_notes: dto.staff_notes ?? null,
        updated_by: actorId,
      })
      .where(eq(schema.inquiries.id, id));

    return this.getInquiry(id);
  }

  async changeStatus(
    id: string,
    dto: ChangeInquiryStatusInput,
    actorId: string,
  ) {
    const existing = await this.getInquiry(id);
    const current = existing.inquiry_status as InquiryStatus;
    const next = dto.status;

    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      throw new BadRequestException(
        `Cannot change inquiry status from ${current} to ${next}`,
      );
    }

    const now = new Date();
    const set: Record<string, unknown> = {
      inquiry_status: next,
      handled_by: actorId,
      updated_by: actorId,
    };

    if (next === 'CONTACTED') {
      set['contacted_at'] = now;
    } else if (next === 'RESOLVED') {
      set['resolved_at'] = now;
      // A direct NEW -> RESOLVED transition still implies contact was made.
      if (!existing.contacted_at) set['contacted_at'] = now;
    }

    await this.db
      .update(schema.inquiries)
      .set(set)
      .where(eq(schema.inquiries.id, id));

    return this.getInquiry(id);
  }

  async archiveInquiry(id: string, actorId: string) {
    await this.getInquiry(id);

    await this.db
      .update(schema.inquiries)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.inquiries.id, id));

    return { ok: true as const };
  }

  private mapRow(row: typeof schema.inquiries.$inferSelect) {
    return {
      id: row.id,
      inquiry_number: row.inquiry_number,
      inquiry_type: row.inquiry_type,
      inquiry_status: row.inquiry_status,
      full_name: row.full_name,
      phone_number: row.phone_number,
      email_address: row.email_address,
      message: row.message,
      enquiry_category: row.enquiry_category,
      package_interest: row.package_interest,
      service_interest: row.service_interest,
      travel_period: row.travel_period,
      group_size: row.group_size,
      source_channel: row.source_channel,
      staff_notes: row.staff_notes,
      handled_by: row.handled_by,
      contacted_at: row.contacted_at,
      resolved_at: row.resolved_at,
      first_viewed_at: row.first_viewed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_deleted: row.is_deleted,
    };
  }
}
