import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BotApiTelegramNotifier,
  DisabledTelegramNotifier,
} from './telegram-notifier.service.js';
import type { InquiryNotification } from '../../../iam/application/ports/mailer.port.js';

const notifier = new BotApiTelegramNotifier({
  botToken: 'test-token',
  chatId: '@kafitour',
  appUrl: 'https://kafi.app',
});

function makeInquiry(
  overrides: Partial<InquiryNotification> = {},
): InquiryNotification {
  return {
    inquiry_id: 'INQ_ID',
    inquiry_number: 'INQ-2026-000001',
    inquiry_type: 'ENQUIRY',
    full_name: 'Amina Yusuf',
    phone_number: '+251911000111',
    email_address: 'amina@example.com',
    message: 'Interested in the Ramadan package.',
    enquiry_category: 'package-booking',
    package_interest: 'comfort',
    service_interest: null,
    travel_period: '2027-02',
    group_size: '2-4',
    source_channel: null,
    received_at: new Date('2026-08-24T10:00:00Z'),
    ...overrides,
  };
}

function getLastFetchBody(): Record<string, string> {
  const fetchMock = (globalThis as any).fetch;
  const calls = fetchMock?.mock?.calls;
  if (!calls?.length) {
    return {};
  }
  return JSON.parse(calls[calls.length - 1][1].body);
}

describe('BotApiTelegramNotifier', () => {
  beforeEach(() => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    });
  });

  it('posts an HTML-formatted summary to the configured chat', async () => {
    await notifier.sendInquiryNotification(makeInquiry());

    const fetchMock = (globalThis as any).fetch;
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');

    const body = getLastFetchBody();
    expect(body.chat_id).toBe('@kafitour');
    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('INQ-2026-000001');
    expect(body.text).toContain('Amina Yusuf');
    expect(body.text).toContain('+251911000111');
    expect(body.text).toContain('Interested in the Ramadan package.');
    expect(body.text).toContain('https://kafi.app/inquiries/INQ_ID');
  });

  it('escapes HTML in user-supplied fields', async () => {
    await notifier.sendInquiryNotification(
      makeInquiry({
        full_name: '<b>Amina</b> & Co',
        message: 'Check <script>alert(1)</script>',
      }),
    );

    const body = getLastFetchBody();
    expect(body.text).toContain('&lt;b&gt;Amina&lt;/b&gt; &amp; Co');
    expect(body.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(body.text).not.toContain('<script>');
  });

  it('omits optional fields that are not provided', async () => {
    await notifier.sendInquiryNotification(
      makeInquiry({ message: null, full_name: null, email_address: null }),
    );

    const body = getLastFetchBody();
    expect(body.text).not.toContain('Message:');
    expect(body.text).toContain('Name:    Not provided');
    expect(body.text).toContain('Email:   Not provided');
  });

  it('throws when Telegram responds with an error', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      notifier.sendInquiryNotification(makeInquiry()),
    ).rejects.toThrow('Telegram API error');
  });
});

describe('DisabledTelegramNotifier', () => {
  it('resolves without calling the Telegram API', async () => {
    (globalThis as any).fetch = vi.fn();

    await expect(
      new DisabledTelegramNotifier().sendInquiryNotification(makeInquiry()),
    ).resolves.toBeUndefined();
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });
});
