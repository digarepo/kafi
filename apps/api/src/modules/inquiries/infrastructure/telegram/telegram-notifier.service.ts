import { Injectable, Logger } from '@nestjs/common';
import type { InquiryNotification } from '../../../iam/application/ports/mailer.port.js';

/**
 * Options for {@link BotApiTelegramNotifier}.
 */
export interface TelegramNotifierOptions {
  botToken: string;
  chatId: string;
  appUrl: string;
}

/**
 * Port for pushing inquiry notifications to a Telegram chat.
 *
 * Implemented by {@link BotApiTelegramNotifier} when a bot token and chat id
 * are configured, or {@link DisabledTelegramNotifier} otherwise, so the
 * inquiry flow can depend on the abstraction unconditionally.
 */
export abstract class TelegramNotifier {
  abstract sendInquiryNotification(
    inquiry: InquiryNotification,
  ): Promise<void>;
}

/**
 * Escapes the three characters Telegram's HTML parse mode treats as markup.
 * Inquiry fields come from public forms and must never inject markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Telegram Bot API implementation. Sends a formatted summary of each new
 * inquiry to the configured staff chat or channel.
 */
@Injectable()
export class BotApiTelegramNotifier extends TelegramNotifier {
  constructor(private readonly options: TelegramNotifierOptions) {
    super();
  }

  async sendInquiryNotification(
    inquiry: InquiryNotification,
  ): Promise<void> {
    const link = `${this.options.appUrl.replace(/\/+$/, '')}/inquiries/${inquiry.inquiry_id}`;
    const typeLabel = inquiry.inquiry_type.toLowerCase();

    const lines = [
      `<b>New ${escapeHtml(typeLabel)} inquiry — ${escapeHtml(inquiry.inquiry_number)}</b>`,
      '',
      `Name:    ${escapeHtml(inquiry.full_name ?? 'Not provided')}`,
      `Phone:   ${escapeHtml(inquiry.phone_number)}`,
      `Email:   ${escapeHtml(inquiry.email_address ?? 'Not provided')}`,
    ];

    if (inquiry.enquiry_category)
      lines.push(`Category: ${escapeHtml(inquiry.enquiry_category)}`);
    if (inquiry.package_interest)
      lines.push(`Package: ${escapeHtml(inquiry.package_interest)}`);
    if (inquiry.service_interest)
      lines.push(`Service: ${escapeHtml(inquiry.service_interest)}`);
    if (inquiry.travel_period)
      lines.push(`Travel period: ${escapeHtml(inquiry.travel_period)}`);
    if (inquiry.group_size)
      lines.push(`Group size: ${escapeHtml(inquiry.group_size)}`);
    if (inquiry.source_channel)
      lines.push(`Source: ${escapeHtml(inquiry.source_channel)}`);

    if (inquiry.message) {
      lines.push('', 'Message:', escapeHtml(inquiry.message));
    }

    lines.push(
      '',
      `Received: ${inquiry.received_at.toISOString()}`,
      `<a href="${escapeHtml(link)}">Open in the admin inbox</a>`,
    );

    const res = await fetch(
      `https://api.telegram.org/bot${this.options.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.options.chatId,
          text: lines.join('\n'),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      },
    );

    if (!res.ok) {
      throw new Error(
        `Telegram API error: ${res.status} ${await res.text()}`,
      );
    }
  }
}

/**
 * No-op implementation used when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are
 * not configured. Logs once per call so a misconfigured deployment is
 * visible in the logs without failing inquiry capture.
 */
@Injectable()
export class DisabledTelegramNotifier extends TelegramNotifier {
  private readonly logger = new Logger(DisabledTelegramNotifier.name);

  async sendInquiryNotification(
    inquiry: InquiryNotification,
  ): Promise<void> {
    this.logger.warn(
      `Telegram notifications are not configured; skipping notification for ${inquiry.inquiry_number}`,
    );
  }
}
