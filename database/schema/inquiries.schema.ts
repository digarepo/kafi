import { relations } from 'drizzle-orm';
import {
  datetime,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core';
import {
  actorMetadata,
  auditMetadata,
  fkUuid,
  idColumn,
  softDeleteMetadata,
} from './common.schema.js';
import { users } from './iam.schema.js';

/**
 * Inbound public inquiries captured from the public website.
 *
 * A single table backs all four public form types so the admin inbox has one
 * list query, one status lifecycle, and one detail view. Per-type validation is
 * enforced at the DTO layer rather than by fragmenting the schema.
 *
 * @remarks
 * - `phone_number` is the only contact field guaranteed present: the callback
 *   form collects nothing else.
 * - Package/service/travel interests are stored as free text on purpose. The
 *   public storefront builds its package options from static local data whose
 *   slugs (`comfort`) do not match published package version slugs
 *   (`comfort-umrah-ramadan-2027`), so a foreign key would be wrong or null in
 *   practice.
 * - `created_by` is NULL for public submissions; the actor columns are nullable
 *   so no synthetic system user is required.
 * - Status is an enum rather than a lookup table, following the
 *   `guarantees.guarantee_status` precedent, because the three inbox states are
 *   fixed and not administrator-managed.
 */
export const inquiries = mysqlTable(
  'inquiries',
  {
    id: idColumn,
    inquiry_number: varchar('inquiry_number', { length: 30 })
      .notNull()
      .unique(),

    inquiry_type: mysqlEnum('inquiry_type', [
      'BOOKING',
      'CALLBACK',
      'CONTACT',
      'ENQUIRY',
    ]).notNull(),
    inquiry_status: mysqlEnum('inquiry_status', [
      'NEW',
      'CONTACTED',
      'RESOLVED',
    ])
      .notNull()
      .default('NEW'),

    // Contact details (union across the four public forms)
    full_name: varchar('full_name', { length: 150 }),
    phone_number: varchar('phone_number', { length: 30 }).notNull(),
    email_address: varchar('email_address', { length: 255 }),

    // Request detail — free text, never foreign keys (see remarks)
    message: text('message'),
    enquiry_category: varchar('enquiry_category', { length: 50 }),
    package_interest: varchar('package_interest', { length: 150 }),
    service_interest: varchar('service_interest', { length: 150 }),
    travel_period: varchar('travel_period', { length: 50 }),
    group_size: varchar('group_size', { length: 20 }),

    // Attribution
    source_channel: varchar('source_channel', { length: 50 }),
    user_agent: varchar('user_agent', { length: 255 }),

    // UTM / campaign attribution captured from the visitor's landing URL.
    // All nullable — only present when the visitor arrived via a tracked link.
    utm_source: varchar('utm_source', { length: 150 }),
    utm_medium: varchar('utm_medium', { length: 150 }),
    utm_campaign: varchar('utm_campaign', { length: 150 }),
    utm_content: varchar('utm_content', { length: 150 }),
    utm_term: varchar('utm_term', { length: 150 }),

    // Cryptographically random opaque visitor identifier (no PII, no
    // fingerprinting). Lets staff correlate an inquiry to an anonymous
    // analytics session without knowing who the visitor is.
    anonymous_visitor_id: varchar('anonymous_visitor_id', { length: 36 }),

    // Handling — flat fields, no assignment table and no status history
    staff_notes: text('staff_notes'),
    handled_by: fkUuid('handled_by'),
    contacted_at: datetime('contacted_at', { mode: 'date' }),
    resolved_at: datetime('resolved_at', { mode: 'date' }),
    first_viewed_at: datetime('first_viewed_at', { mode: 'date' }),

    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('inquiries_status_idx').on(table.inquiry_status),
    index('inquiries_type_idx').on(table.inquiry_type),
    index('inquiries_created_at_idx').on(table.created_at),
    index('inquiries_phone_number_idx').on(table.phone_number),
  ],
);

// Relations

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  handledBy: one(users, {
    fields: [inquiries.handled_by],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [inquiries.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [inquiries.updated_by],
    references: [users.id],
  }),
}));
