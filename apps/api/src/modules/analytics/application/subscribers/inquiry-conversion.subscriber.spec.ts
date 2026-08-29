import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InquiryConversionSubscriber } from './inquiry-conversion.subscriber.js';
import { AnalyticsEventsService } from '../services/analytics-events.service.js';

describe('InquiryConversionSubscriber', () => {
  let subscriber: InquiryConversionSubscriber;
  let recordMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    recordMock = vi.fn().mockResolvedValue('ULID_CONVERSION');
    const analytics = {
      record: recordMock,
    } as unknown as AnalyticsEventsService;
    subscriber = new InquiryConversionSubscriber(analytics);
  });

  it('records an inquiry_submitted conversion event linked to the inquiry', async () => {
    await subscriber.handleInquiryCreated({
      type: 'inquiries.inquiry.created',
      occurred_at: new Date().toISOString(),
      inquiry_id: '01HXYZINQUIRYID',
      inquiry_number: 'INQ-2026-000001',
      inquiry_type: 'BOOKING',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'ramadan-2026',
      anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
      created_at: new Date().toISOString(),
    });

    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'inquiry_submitted',
        event_type: 'conversion',
        inquiry_id: '01HXYZINQUIRYID',
        anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'ramadan-2026',
        payload: {
          inquiry_type: 'BOOKING',
          inquiry_number: 'INQ-2026-000001',
        },
      }),
    );
  });

  it('handles events with null attribution gracefully', async () => {
    await subscriber.handleInquiryCreated({
      type: 'inquiries.inquiry.created',
      occurred_at: new Date().toISOString(),
      inquiry_id: '01HXYZINQUIRYID2',
      inquiry_number: 'INQ-2026-000002',
      inquiry_type: 'CALLBACK',
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      anonymous_visitor_id: null,
      created_at: new Date().toISOString(),
    });

    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'inquiry_submitted',
        event_type: 'conversion',
        anonymous_visitor_id: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
      }),
    );
  });
});
