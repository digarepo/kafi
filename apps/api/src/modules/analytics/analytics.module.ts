import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module.js';
import { AnalyticsEventsService } from './application/services/analytics-events.service.js';
import { InquiryConversionSubscriber } from './application/subscribers/inquiry-conversion.subscriber.js';
import { PublicAnalyticsController } from './presentation/controllers/public-analytics.controller.js';

/**
 * Analytics bounded context: first-party business event tracking.
 *
 * @remarks
 * - Owns the `analytics_events` table.
 * - Exposes a single public ingestion endpoint (`POST /api/public/events`).
 * - Subscribes to `inquiries.inquiry.created` to record authoritative
 *   conversion events.
 * - Pageviews, visitors, and sessions are handled by Plausible and are NOT
 *   duplicated here.
 */
@Module({
  imports: [SharedModule],
  controllers: [PublicAnalyticsController],
  providers: [AnalyticsEventsService, InquiryConversionSubscriber],
  exports: [AnalyticsEventsService],
})
export class AnalyticsModule {}
