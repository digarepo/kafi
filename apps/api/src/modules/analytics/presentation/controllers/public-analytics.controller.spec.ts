import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { PublicAnalyticsController } from './public-analytics.controller.js';
import { AnalyticsEventsService } from '../../application/services/analytics-events.service.js';

describe('PublicAnalyticsController', () => {
  let controller: PublicAnalyticsController;
  let recordMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    recordMock = vi.fn().mockResolvedValue('ULID_TEST');
    const analytics = {
      record: recordMock,
    } as unknown as AnalyticsEventsService;
    controller = new PublicAnalyticsController(analytics);
  });

  it('accepts a valid share event with allowed payload keys', () => {
    expect(() =>
      controller.track({
        event_name: 'share',
        payload: {
          channel: 'whatsapp',
          content_type: 'package',
          content_id: 'ramadan-2026',
        },
      } as any),
    ).not.toThrow();
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'share',
        payload: {
          channel: 'whatsapp',
          content_type: 'package',
          content_id: 'ramadan-2026',
        },
      }),
    );
  });

  it('accepts a cta_click event with allowed payload keys', () => {
    expect(() =>
      controller.track({
        event_name: 'cta_click',
        payload: { cta_label: 'Book Now', page_path: '/packages/ramadan-2026' },
      } as any),
    ).not.toThrow();
    expect(recordMock).toHaveBeenCalled();
  });

  it('accepts a booking_started event with allowed payload keys', () => {
    expect(() =>
      controller.track({
        event_name: 'booking_started',
        payload: {
          package_slug: 'ramadan-2026',
          package_name: 'Ramadan Umrah',
        },
      } as any),
    ).not.toThrow();
    expect(recordMock).toHaveBeenCalled();
  });

  it('rejects an inquiry_submitted event from the client (server-only event)', () => {
    // inquiry_submitted is created exclusively by the server-side conversion
    // subscriber. Clients cannot send it directly to prevent fake conversions.
    expect(() =>
      controller.track({
        event_name: 'inquiry_submitted',
        payload: {
          inquiry_type: 'callback',
          inquiry_number: 'INQ-2026-000001',
        },
      } as any),
    ).toThrow(); // Zod enum validation rejects it
  });

  it('rejects an event with disallowed payload keys', () => {
    expect(() =>
      controller.track({
        event_name: 'share',
        payload: { channel: 'whatsapp', forbidden_key: 'should be rejected' },
      } as any),
    ).toThrow(BadRequestException);
  });

  it('accepts an event with no payload', () => {
    expect(() =>
      controller.track({
        event_name: 'share',
        payload: null,
      } as any),
    ).not.toThrow();
    expect(recordMock).toHaveBeenCalled();
  });

  it('passes attribution fields through to the service', () => {
    controller.track({
      event_name: 'share',
      payload: { channel: 'whatsapp' },
      anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'ramadan-2026',
      page_path: '/packages/ramadan-2026',
      referrer: 'https://google.com',
    } as any);

    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'share',
        anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'ramadan-2026',
        page_path: '/packages/ramadan-2026',
        referrer: 'https://google.com',
      }),
    );
  });
});
