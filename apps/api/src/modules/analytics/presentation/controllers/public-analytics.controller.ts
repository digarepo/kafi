import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';

import { RateLimitGuard } from '../../../../shared/application/guards/rate-limit.guard.js';
import { AnalyticsEventsService } from '../../application/services/analytics-events.service.js';
import {
  type PublicAnalyticsEventInput,
  PublicAnalyticsEventDto,
} from '../../application/dto/analytics-event.dto.js';

/**
 * Per-event allowed payload keys.
 *
 * Only these keys may appear in the `payload` object for a given event.
 * Any other key causes the request to be rejected. This prevents the endpoint
 * from becoming an arbitrary-JSON dump.
 */
const PAYLOAD_KEY_ALLOWLIST: Record<string, readonly string[]> = {
  share: ['channel', 'content_type', 'content_id'],
  cta_click: ['cta_label', 'page_path', 'content_type', 'content_id'],
  booking_started: ['package_slug', 'package_name'],
};

/**
 * Public analytics event ingestion for the website.
 *
 * @remarks
 * - Accepts only allowlisted event names with bounded, typed payloads.
 * - Rate-limited via the existing `RateLimitGuard` (keys on `ip:path`).
 * - Does NOT accept or persist IP addresses, user-agent, or any PII.
 * - Pageviews/visitors/sessions are handled by Plausible, not this endpoint.
 */
@Controller('public/events')
@UseGuards(RateLimitGuard)
export class PublicAnalyticsController {
  constructor(private readonly events: AnalyticsEventsService) {}

  @Post()
  @HttpCode(204)
  track(@Body() dto: PublicAnalyticsEventDto): void {
    const input = dto as unknown as PublicAnalyticsEventInput;

    // Reject server-only events that clients must not send directly.
    // `inquiry_submitted` is created exclusively by the server-side
    // conversion subscriber after an inquiry is persisted. The cast is
    // needed because the DTO type intentionally excludes this value.
    if ((input.event_name as string) === 'inquiry_submitted') {
      throw new BadRequestException(
        'Event "inquiry_submitted" can only be created server-side',
      );
    }

    // Validate payload keys against the per-event allowlist.
    const allowedKeys = PAYLOAD_KEY_ALLOWLIST[input.event_name];
    if (allowedKeys && input.payload) {
      const extraKeys = Object.keys(input.payload).filter(
        (key) => !allowedKeys.includes(key),
      );
      if (extraKeys.length > 0) {
        throw new BadRequestException(
          `Unexpected payload keys for event "${input.event_name}": ${extraKeys.join(', ')}`,
        );
      }
    }

    // Fire-and-forget — a tracking failure must not break the user request.
    void this.events.record({
      event_name: input.event_name,
      event_type: 'custom',
      anonymous_visitor_id: input.anonymous_visitor_id ?? null,
      page_path: input.page_path ?? null,
      referrer: input.referrer ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      utm_content: input.utm_content ?? null,
      utm_term: input.utm_term ?? null,
      payload: input.payload ?? null,
    });
  }
}
