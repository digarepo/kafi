import { Inject, Injectable, Logger } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import * as schema from '@kafi/database';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';

/**
 * Input for recording a first-party analytics event.
 */
export interface RecordEventInput {
  event_name: string;
  event_type?: 'custom' | 'conversion';
  anonymous_visitor_id?: string | null;
  page_path?: string | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  payload?: Record<string, unknown> | null;
  inquiry_id?: string | null;
}

/**
 * Persists first-party analytics events that Kafi owns and may need to query
 * alongside business data (shares, CTA clicks, conversions).
 *
 * @remarks
 * - Pageviews, visitors, and sessions are handled by Plausible and are NOT
 *   recorded here.
 * - No raw IP addresses are persisted.
 * - No PII is stored in `payload`; the caller is responsible for ensuring the
 *   payload contains only non-sensitive, allowlisted keys.
 */
@Injectable()
export class AnalyticsEventsService {
  private readonly logger = new Logger(AnalyticsEventsService.name);

  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  /**
   * Records a single analytics event. Errors are logged but never thrown so
   * a tracking failure cannot break the user-facing request that triggered it.
   */
  async record(input: RecordEventInput): Promise<string> {
    const id = ulid();
    try {
      await this.db.insert(schema.analyticsEvents).values({
        id,
        event_name: input.event_name,
        event_type: input.event_type ?? 'custom',
        anonymous_visitor_id: input.anonymous_visitor_id ?? null,
        page_path: input.page_path ?? null,
        referrer: input.referrer ?? null,
        utm_source: input.utm_source ?? null,
        utm_medium: input.utm_medium ?? null,
        utm_campaign: input.utm_campaign ?? null,
        utm_content: input.utm_content ?? null,
        utm_term: input.utm_term ?? null,
        payload: input.payload ?? null,
        inquiry_id: input.inquiry_id ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record analytics event "${input.event_name}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return id;
  }
}
