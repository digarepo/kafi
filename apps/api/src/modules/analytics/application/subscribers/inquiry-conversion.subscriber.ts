import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { type DomainEvent } from '../../../../shared/kernel/domain-event.js';
import { AnalyticsEventsService } from '../services/analytics-events.service.js';
import {
  INQUIRY_CREATED,
  type InquiryCreatedPayload,
} from '../../../inquiries/domain/events/inquiry-created.event.js';

/**
 * Listens for `inquiries.inquiry.created` domain events and records an
 * authoritative `conversion` analytics event.
 *
 * @remarks
 * - This is the single source of truth for inquiry conversions in the
 *   first-party analytics table.
 * - Duplicate prevention: the inquiry row itself is the idempotency boundary.
 *   If the public inquiry POST is retried, the `InquiriesService.create` call
 *   produces a new inquiry row (with a new ULID + inquiry number), so a second
 *   conversion event is correct — it represents a genuinely duplicate
 *   submission. True idempotency at the HTTP layer (e.g. an idempotency key)
 *   is out of scope for this iteration.
 * - The payload contains only non-sensitive data: inquiry type and number.
 *   No PII is stored in the analytics event.
 */
@Injectable()
export class InquiryConversionSubscriber {
  private readonly logger = new Logger(InquiryConversionSubscriber.name);

  constructor(private readonly events: AnalyticsEventsService) {}

  @OnEvent(INQUIRY_CREATED)
  async handleInquiryCreated(
    payload: DomainEvent & InquiryCreatedPayload,
  ): Promise<void> {
    await this.events.record({
      event_name: 'inquiry_submitted',
      event_type: 'conversion',
      anonymous_visitor_id: payload.anonymous_visitor_id,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      inquiry_id: payload.inquiry_id,
      payload: {
        inquiry_type: payload.inquiry_type,
        inquiry_number: payload.inquiry_number,
      },
    });
  }
}
