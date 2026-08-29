import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InquiriesService } from './inquiries.service.js';
import { BusinessNumberService } from '../../../../shared/infrastructure/numbering/business-number.service.js';
import { Mailer } from '../../../iam/application/ports/mailer.port.js';
import { AnalyticsEventsService } from '../../../analytics/application/services/analytics-events.service.js';

/**
 * Minimal chainable Drizzle-style mock.
 *
 * Kept local to the inquiries module rather than reusing the travellers mock so
 * this slice's tests do not depend on another bounded context, and so `groupBy`
 * (needed by the summary query) can be supported.
 *
 * @remarks
 * Each `select()` returns a *fresh* builder that captures its own result from
 * the queue at call time, mirroring real Drizzle where every query is a
 * separate object. A single shared instance would break `Promise.all([...])`,
 * because a chain ending in an eager `.then()` would consume another query's
 * queued value. `insert()`/`update()` resolve to `undefined` and never consume
 * the queue, so queues only need to list the results of `select()` calls, in
 * call order.
 */
class MockChain {
  constructor(
    private readonly value: unknown,
    private readonly db: MockDb,
  ) {}

  then(onFulfilled?: (value: unknown) => unknown) {
    if (typeof onFulfilled === 'function') {
      try {
        return Promise.resolve(onFulfilled(this.value));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return Promise.resolve(this.value);
  }

  from() {
    return this;
  }
  where() {
    return this;
  }
  orderBy() {
    return this;
  }
  limit() {
    return this;
  }
  offset() {
    return this;
  }
  groupBy() {
    return this;
  }

  values(args: Record<string, unknown>) {
    this.db.inserted.push(args);
    return this;
  }

  set(args: Record<string, unknown>) {
    this.db.updateSets.push(args);
    return this;
  }
}

class MockDb {
  queue: unknown[] = [];
  updateSets: Record<string, unknown>[] = [];
  inserted: Record<string, unknown>[] = [];

  setQueue(values: unknown[]) {
    this.queue = [...values];
    return this;
  }

  /** Consumes the next queued result. */
  select() {
    return new MockChain(this.queue.shift(), this);
  }

  /** Writes resolve to undefined and never consume the queue. */
  insert() {
    return new MockChain(undefined, this);
  }

  update() {
    return new MockChain(undefined, this);
  }
}

function inquiryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'INQ_ID',
    inquiry_number: 'INQ-2026-000001',
    inquiry_type: 'CONTACT',
    inquiry_status: 'NEW',
    full_name: 'Amina Yusuf',
    phone_number: '+251911000111',
    email_address: 'amina@example.com',
    message: 'I would like details about the Ramadan package.',
    enquiry_category: 'package-booking',
    package_interest: 'comfort',
    service_interest: null,
    travel_period: '2027-02',
    group_size: '2-4',
    source_channel: null,
    staff_notes: null,
    handled_by: null,
    contacted_at: null,
    resolved_at: null,
    first_viewed_at: null,
    created_at: new Date('2026-08-24T10:00:00Z'),
    updated_at: new Date('2026-08-24T10:00:00Z'),
    is_deleted: false,
    ...overrides,
  };
}

function buildService(db: any, mailer?: Partial<Mailer>) {
  const numbers = {
    generateInquiryNumber: vi.fn().mockResolvedValue('INQ-2026-000001'),
  } as unknown as BusinessNumberService;

  const mailerImpl = {
    sendInquiryNotification: vi.fn().mockResolvedValue(undefined),
    ...mailer,
  } as unknown as Mailer;

  const eventEmitter = {
    emit: vi.fn(),
  } as unknown as EventEmitter2;

  const analytics = {
    record: vi.fn().mockResolvedValue('ULID_ANALYTICS'),
  } as unknown as AnalyticsEventsService;

  return {
    service: new InquiriesService(
      db,
      numbers,
      mailerImpl,
      eventEmitter,
      analytics,
    ),
    mailer: mailerImpl,
    numbers,
    eventEmitter,
    analytics,
  };
}

const ACTOR = 'ULIDSTAFFUSER';

describe('InquiriesService', () => {
  const originalRecipients = process.env['INQUIRY_NOTIFY_EMAILS'];

  beforeEach(() => {
    process.env['INQUIRY_NOTIFY_EMAILS'] = 'ops@kafitour.com';
  });

  afterEach(() => {
    if (originalRecipients === undefined) {
      delete process.env['INQUIRY_NOTIFY_EMAILS'];
    } else {
      process.env['INQUIRY_NOTIFY_EMAILS'] = originalRecipients;
    }
    vi.restoreAllMocks();
  });

  describe('public capture', () => {
    it('stores a booking inquiry with type BOOKING and status NEW', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      const result = await service.createBookingInquiry(
        {
          fullName: 'Nur Hassan',
          phone: '+251911222333',
          email: 'nur@example.com',
          package: 'comfort',
          travelPeriod: 'ramadan-2026',
          numberOfTravellers: '2-4',
          message: 'Looking for a family booking.',
        } as any,
        { userAgent: 'jest-agent' },
      );

      expect(result).toEqual({ ok: true, inquiry_number: 'INQ-2026-000001' });
      const row = db.inserted[0]!;
      expect(row['inquiry_type']).toBe('BOOKING');
      expect(row['inquiry_status']).toBe('NEW');
      expect(row['travel_period']).toBe('ramadan-2026');
      expect(row['group_size']).toBe('2-4');
      expect(row['package_interest']).toBe('comfort');
      // Public submissions have no authenticated actor.
      expect(row['created_by']).toBeNull();
      expect(row['updated_by']).toBeNull();
    });

    it('stores a callback inquiry with only phone, name and source', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      await service.createCallbackInquiry(
        { phone: '0911222333', fullName: 'Sara', source: 'homepage' } as any,
        {},
      );

      const row = db.inserted[0]!;
      expect(row['inquiry_type']).toBe('CALLBACK');
      expect(row['phone_number']).toBe('0911222333');
      expect(row['source_channel']).toBe('homepage');
      expect(row['email_address']).toBeNull();
      expect(row['message']).toBeNull();
    });

    it('stores a contact inquiry including the enquiry category', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      await service.createContactInquiry(
        {
          fullName: 'Amina Yusuf',
          email: 'amina@example.com',
          phone: '0911000111',
          enquiryType: 'visa-questions',
          packageInterest: 'premium',
          groupSize: '1',
          travelPeriod: '2027-02',
          message: 'I have questions about the visa process for my family.',
        } as any,
        {},
      );

      const row = db.inserted[0]!;
      expect(row['inquiry_type']).toBe('CONTACT');
      expect(row['enquiry_category']).toBe('visa-questions');
      expect(row['package_interest']).toBe('premium');
      expect(row['group_size']).toBe('1');
    });

    it('stores an enquiry inquiry including the service interest', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      await service.createEnquiryInquiry(
        {
          fullName: 'Ibrahim Ali',
          phone: '+251911444555',
          email: '',
          package: 'economy',
          service: 'visa-assistance',
          message: 'Please share the requirements.',
        } as any,
        {},
      );

      const row = db.inserted[0]!;
      expect(row['inquiry_type']).toBe('ENQUIRY');
      expect(row['service_interest']).toBe('visa-assistance');
      expect(row['email_address']).toBeNull();
    });

    it('persists UTM attribution and anonymous visitor ID on a booking inquiry', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      await service.createBookingInquiry(
        {
          fullName: 'Nur Hassan',
          phone: '+251911222333',
          email: 'nur@example.com',
          package: 'comfort',
          travelPeriod: 'ramadan-2026',
          numberOfTravellers: '2-4',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'ramadan-2026',
          utm_content: 'ad-1',
          utm_term: 'umrah',
          anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
        } as any,
        {},
      );

      const row = db.inserted[0]!;
      expect(row['utm_source']).toBe('google');
      expect(row['utm_medium']).toBe('cpc');
      expect(row['utm_campaign']).toBe('ramadan-2026');
      expect(row['utm_content']).toBe('ad-1');
      expect(row['utm_term']).toBe('umrah');
      expect(row['anonymous_visitor_id']).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );
    });

    it('emits an inquiry.created domain event after persisting a booking inquiry', async () => {
      const db = new MockDb().setQueue([]);
      const { service, eventEmitter } = buildService(db);

      await service.createBookingInquiry(
        {
          fullName: 'Nur Hassan',
          phone: '+251911222333',
          package: 'comfort',
          travelPeriod: 'ramadan-2026',
          numberOfTravellers: '2-4',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'ramadan-2026',
          anonymous_visitor_id: '550e8400-e29b-41d4-a716-446655440000',
        } as any,
        {},
      );

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      const [eventType, payload] = (eventEmitter.emit as any).mock.calls[0];
      expect(eventType).toBe('inquiries.inquiry.created');
      expect(payload.inquiry_type).toBe('BOOKING');
      expect(payload.utm_source).toBe('google');
      expect(payload.anonymous_visitor_id).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      // No PII in the event payload.
      expect(payload).not.toHaveProperty('full_name');
      expect(payload).not.toHaveProperty('phone_number');
      expect(payload).not.toHaveProperty('email_address');
    });

    it('stores null attribution when no UTM params are provided', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      await service.createCallbackInquiry(
        { phone: '0911222333', fullName: 'Sara', source: 'homepage' } as any,
        {},
      );

      const row = db.inserted[0]!;
      expect(row['utm_source']).toBeNull();
      expect(row['utm_medium']).toBeNull();
      expect(row['utm_campaign']).toBeNull();
      expect(row['anonymous_visitor_id']).toBeNull();
    });

    it('truncates an over-long user agent to the column width', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db);

      await service.createCallbackInquiry({ phone: '0911222333' } as any, {
        userAgent: 'x'.repeat(400),
      });

      expect((db.inserted[0]!['user_agent'] as string).length).toBe(255);
    });
  });

  describe('staff notification', () => {
    it('notifies the configured recipients after a successful write', async () => {
      process.env['INQUIRY_NOTIFY_EMAILS'] =
        'ops@kafitour.com, leads@kafitour.com';
      const db = new MockDb().setQueue([]);
      const { service, mailer } = buildService(db);

      await service.createCallbackInquiry({ phone: '0911222333' } as any, {});

      expect(mailer.sendInquiryNotification).toHaveBeenCalledTimes(1);
      const [recipients, payload] = (mailer.sendInquiryNotification as any).mock
        .calls[0];
      expect(recipients).toEqual(['ops@kafitour.com', 'leads@kafitour.com']);
      expect(payload.inquiry_number).toBe('INQ-2026-000001');
      expect(payload.inquiry_type).toBe('CALLBACK');
    });

    it('still succeeds when the mail provider fails', async () => {
      const db = new MockDb().setQueue([]);
      const { service } = buildService(db, {
        sendInquiryNotification: vi
          .fn()
          .mockRejectedValue(new Error('Resend API error: 429')),
      });

      // The row is already committed, so a provider outage must not surface.
      await expect(
        service.createCallbackInquiry({ phone: '0911222333' } as any, {}),
      ).resolves.toEqual({ ok: true, inquiry_number: 'INQ-2026-000001' });
    });

    it('skips notification when no recipients are configured', async () => {
      delete process.env['INQUIRY_NOTIFY_EMAILS'];
      const db = new MockDb().setQueue([]);
      const { service, mailer } = buildService(db);

      await expect(
        service.createCallbackInquiry({ phone: '0911222333' } as any, {}),
      ).resolves.toMatchObject({ ok: true });
      expect(mailer.sendInquiryNotification).not.toHaveBeenCalled();
    });
  });

  describe('status transitions', () => {
    it('allows NEW -> CONTACTED and stamps contacted_at and handled_by', async () => {
      const db = new MockDb().setQueue([
        [inquiryRow({ inquiry_status: 'NEW', first_viewed_at: new Date() })],
        [inquiryRow({ inquiry_status: 'CONTACTED' })],
      ]);
      const { service } = buildService(db);

      await service.changeStatus('INQ_ID', { status: 'CONTACTED' }, ACTOR);

      const set = db.updateSets[0]!;
      expect(set['inquiry_status']).toBe('CONTACTED');
      expect(set['handled_by']).toBe(ACTOR);
      expect(set['contacted_at']).toBeInstanceOf(Date);
      expect(set['resolved_at']).toBeUndefined();
    });

    it('allows a direct NEW -> RESOLVED and backfills contacted_at', async () => {
      const db = new MockDb().setQueue([
        [
          inquiryRow({
            inquiry_status: 'NEW',
            contacted_at: null,
            first_viewed_at: new Date(),
          }),
        ],
        [inquiryRow({ inquiry_status: 'RESOLVED' })],
      ]);
      const { service } = buildService(db);

      await service.changeStatus('INQ_ID', { status: 'RESOLVED' }, ACTOR);

      const set = db.updateSets[0]!;
      expect(set['inquiry_status']).toBe('RESOLVED');
      expect(set['resolved_at']).toBeInstanceOf(Date);
      // Resolving implies contact was made.
      expect(set['contacted_at']).toBeInstanceOf(Date);
    });

    it('preserves the original contacted_at on CONTACTED -> RESOLVED', async () => {
      const contactedAt = new Date('2026-08-20T09:00:00Z');
      const db = new MockDb().setQueue([
        [
          inquiryRow({
            inquiry_status: 'CONTACTED',
            contacted_at: contactedAt,
            first_viewed_at: new Date(),
          }),
        ],
        [inquiryRow({ inquiry_status: 'RESOLVED' })],
      ]);
      const { service } = buildService(db);

      await service.changeStatus('INQ_ID', { status: 'RESOLVED' }, ACTOR);

      expect(db.updateSets[0]!['contacted_at']).toBeUndefined();
    });

    it('rejects CONTACTED -> CONTACTED', async () => {
      const db = new MockDb().setQueue([
        [inquiryRow({ inquiry_status: 'CONTACTED' })],
      ]);
      const { service } = buildService(db);

      await expect(
        service.changeStatus('INQ_ID', { status: 'CONTACTED' }, ACTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects any transition out of the terminal RESOLVED state', async () => {
      const db = new MockDb().setQueue([
        [inquiryRow({ inquiry_status: 'RESOLVED' })],
      ]);
      const { service } = buildService(db);

      await expect(
        service.changeStatus('INQ_ID', { status: 'CONTACTED' }, ACTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('detail, notes and archive', () => {
    it('throws NotFound for a soft-deleted inquiry', async () => {
      const db = new MockDb().setQueue([[inquiryRow({ is_deleted: true })]]);
      const { service } = buildService(db);

      await expect(service.getInquiry('INQ_ID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound when the inquiry does not exist', async () => {
      const db = new MockDb().setQueue([[]]);
      const { service } = buildService(db);

      await expect(service.getInquiry('MISSING')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('saves staff notes and records the actor', async () => {
      const db = new MockDb().setQueue([
        [inquiryRow({ first_viewed_at: new Date() })],
        [inquiryRow({ staff_notes: 'Called, no answer.' })],
      ]);
      const { service } = buildService(db);

      const result = await service.updateInquiry(
        'INQ_ID',
        { staff_notes: 'Called, no answer.' },
        ACTOR,
      );

      expect(db.updateSets[0]!['staff_notes']).toBe('Called, no answer.');
      expect(db.updateSets[0]!['updated_by']).toBe(ACTOR);
      expect(result.staff_notes).toBe('Called, no answer.');
    });

    it('soft deletes on archive', async () => {
      const db = new MockDb().setQueue([
        [inquiryRow({ first_viewed_at: new Date() })],
      ]);
      const { service } = buildService(db);

      await expect(service.archiveInquiry('INQ_ID', ACTOR)).resolves.toEqual({
        ok: true,
      });

      const set = db.updateSets[0]!;
      expect(set['is_deleted']).toBe(true);
      expect(set['deleted_at']).toBeInstanceOf(Date);
    });
  });

  describe('listing and summary', () => {
    it('returns mapped rows with pagination metadata', async () => {
      const db = new MockDb().setQueue([
        [inquiryRow(), inquiryRow({ id: 'INQ_2' })],
        [{ count: 2 }],
      ]);
      const { service } = buildService(db);

      const result = await service.listInquiries({
        page: 1,
        page_size: 10,
        status: 'NEW',
      } as any);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(10);
      expect(result.data[0]!.inquiry_number).toBe('INQ-2026-000001');
    });

    it('aggregates status counts into a summary', async () => {
      const db = new MockDb().setQueue([
        [
          { status: 'NEW', count: 4 },
          { status: 'CONTACTED', count: 2 },
          { status: 'RESOLVED', count: 7 },
        ],
        [{ count: 3 }],
      ]);
      const { service } = buildService(db);

      await expect(service.getSummary()).resolves.toEqual({
        new: 4,
        contacted: 2,
        resolved: 7,
        unviewed: 3,
        total: 13,
      });
    });

    it('returns zeroed summary counts when there are no inquiries', async () => {
      const db = new MockDb().setQueue([[], [{ count: 0 }]]);
      const { service } = buildService(db);

      await expect(service.getSummary()).resolves.toEqual({
        new: 0,
        contacted: 0,
        resolved: 0,
        unviewed: 0,
        total: 0,
      });
    });
  });
});
