import { sql } from 'drizzle-orm';
import {
  datetime,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { idColumn } from './common.schema.js';
import { inquiries } from './inquiries.schema.js';

/**
 * Analytics event types.
 *
 * - `custom` — generic client-tracked interaction (share, cta_click, etc.).
 * - `conversion` — an authoritative business conversion recorded server-side
 *   (e.g. inquiry submitted). Joined to the originating inquiry when known.
 */
export const ANALYTICS_EVENT_TYPES = ['custom', 'conversion'] as const;
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

/**
 * First-party analytics events owned by Kafi.
 *
 * Stores only events that Kafi may need to query alongside business data
 * (shares, CTA clicks, conversions). Pageviews, visitors, and sessions are
 * handled by Plausible and are NOT duplicated here.
 *
 * @remarks
 * - No raw IP addresses are persisted (privacy policy).
 * - No PII (names, emails, phone numbers) is stored in `payload`.
 * - `anonymous_visitor_id` is a cryptographically random opaque identifier
 *   generated client-side; it carries no personally identifying information and
 *   is not derived from IP, user-agent, canvas, fonts, or any fingerprinting
 *   signal.
 * - `payload` is a small, validated JSON object with an explicit allowlist of
 *   keys per event — never an arbitrary JSON dump.
 */
export const analyticsEvents = mysqlTable(
  'analytics_events',
  {
    id: idColumn,
    event_name: varchar('event_name', { length: 50 }).notNull(),
    event_type: mysqlEnum('event_type', ANALYTICS_EVENT_TYPES)
      .notNull()
      .default('custom'),
    anonymous_visitor_id: varchar('anonymous_visitor_id', { length: 36 }),
    page_path: varchar('page_path', { length: 500 }),
    referrer: varchar('referrer', { length: 500 }),
    utm_source: varchar('utm_source', { length: 150 }),
    utm_medium: varchar('utm_medium', { length: 150 }),
    utm_campaign: varchar('utm_campaign', { length: 150 }),
    utm_content: varchar('utm_content', { length: 150 }),
    utm_term: varchar('utm_term', { length: 150 }),
    payload: json('payload'),
    inquiry_id: varchar('inquiry_id', { length: 26 }),
    created_at: datetime('created_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('analytics_events_name_type_created_idx').on(
      table.event_name,
      table.event_type,
      table.created_at,
    ),
    index('analytics_events_visitor_id_idx').on(table.anonymous_visitor_id),
    index('analytics_events_inquiry_id_idx').on(table.inquiry_id),
    index('analytics_events_utm_source_created_idx').on(
      table.utm_source,
      table.created_at,
    ),
  ],
);
