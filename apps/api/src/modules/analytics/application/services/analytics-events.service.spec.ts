import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsEventsService } from './analytics-events.service.js';

/**
 * Minimal chainable Drizzle-style mock that records inserted rows.
 */
class MockDb {
  public inserted: Array<Record<string, unknown>> = [];

  insert(_table: unknown) {
    const self = this;
    return {
      values(row: Record<string, unknown>) {
        self.inserted.push(row);
        return Promise.resolve();
      },
    };
  }
}

describe('AnalyticsEventsService', () => {
  let service: AnalyticsEventsService;
  let db: MockDb;

  beforeEach(() => {
    db = new MockDb();
    service = new AnalyticsEventsService(db as any);
  });

  it('records an event with all fields populated', async () => {
    await service.record({
      event_name: 'share',
      event_type: 'custom',
      anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
      page_path: '/packages/ramadan-2026',
      referrer: 'https://google.com',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'ramadan-2026',
      utm_content: 'ad-1',
      utm_term: 'umrah',
      payload: { channel: 'whatsapp' },
      inquiry_id: null,
    });

    expect(db.inserted).toHaveLength(1);
    const row = db.inserted[0]!;
    expect(row['event_name']).toBe('share');
    expect(row['event_type']).toBe('custom');
    expect(row['anonymous_visitor_id']).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(row['utm_source']).toBe('google');
    expect(row['payload']).toEqual({ channel: 'whatsapp' });
    expect(row['id']).toMatch(/^[0-9A-Z]{26}$/); // ULID
  });

  it('defaults event_type to "custom" when not specified', async () => {
    await service.record({ event_name: 'cta_click' });
    expect(db.inserted[0]!['event_type']).toBe('custom');
  });

  it('defaults nullable fields to null when not provided', async () => {
    await service.record({ event_name: 'share' });
    const row = db.inserted[0]!;
    expect(row['anonymous_visitor_id']).toBeNull();
    expect(row['page_path']).toBeNull();
    expect(row['referrer']).toBeNull();
    expect(row['utm_source']).toBeNull();
    expect(row['payload']).toBeNull();
    expect(row['inquiry_id']).toBeNull();
  });

  it('does not throw when the database insert fails', async () => {
    const failingDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      }),
    };
    const failingService = new AnalyticsEventsService(failingDb as any);
    // Should not throw — analytics failures must not break user requests.
    await expect(failingService.record({ event_name: 'share' })).resolves.toBeDefined();
  });
});
