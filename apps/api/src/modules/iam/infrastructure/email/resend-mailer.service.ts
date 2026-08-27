import { Injectable } from '@nestjs/common';
import {
  Mailer,
  type InquiryNotification,
} from '../../application/ports/mailer.port.js';

/**
 * Options for {@link ResendMailer}.
 */
export interface ResendMailerOptions {
  apiKey: string;
  from: string;
  appUrl: string;
}

/**
 * Production Resend-backed mailer implementation using the Resend REST API.
 */
@Injectable()
export class ResendMailer implements Mailer {
  private static readonly API_URL = 'https://api.resend.com/emails';

  constructor(private readonly options: ResendMailerOptions) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const text = `Verify your Kafi Tours account email\n\nClick the link below to verify your email:\n${link}\n\nThis link expires in 24 hours.`;

    await this.sendEmail(to, 'Verify your email', text);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${this.baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const text = `Reset your Kafi Tours password\n\nClick the link below to reset your password:\n${link}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`;

    await this.sendEmail(to, 'Reset your password', text);
  }

  async sendWelcomeEmail(to: string, temporaryPassword: string): Promise<void> {
    const loginUrl = `${this.baseUrl}/login`;
    const text = `Welcome to Kafi Tours\n\nYour staff account has been created.\n\nTemporary password: ${temporaryPassword}\n\nLog in here:\n${loginUrl}\n\nYou will be prompted to change this password on your first login.`;

    await this.sendEmail(to, 'Welcome to Kafi Tours', text);
  }

  async sendInquiryNotification(
    to: string[],
    inquiry: InquiryNotification,
  ): Promise<void> {
    const link = `${this.baseUrl}/inquiries/${inquiry.inquiry_id}`;
    const typeLabel = inquiry.inquiry_type.toLowerCase();

    const lines = [
      `New ${typeLabel} inquiry received: ${inquiry.inquiry_number}`,
      '',
      `Name:    ${inquiry.full_name ?? 'Not provided'}`,
      `Phone:   ${inquiry.phone_number}`,
      `Email:   ${inquiry.email_address ?? 'Not provided'}`,
    ];

    if (inquiry.enquiry_category)
      lines.push(`Category: ${inquiry.enquiry_category}`);
    if (inquiry.package_interest)
      lines.push(`Package: ${inquiry.package_interest}`);
    if (inquiry.service_interest)
      lines.push(`Service: ${inquiry.service_interest}`);
    if (inquiry.travel_period)
      lines.push(`Travel period: ${inquiry.travel_period}`);
    if (inquiry.group_size) lines.push(`Group size: ${inquiry.group_size}`);
    if (inquiry.source_channel) lines.push(`Source: ${inquiry.source_channel}`);

    if (inquiry.message) {
      lines.push('', 'Message:', inquiry.message);
    }

    lines.push(
      '',
      `Received: ${inquiry.received_at.toISOString()}`,
      '',
      `Open in the admin inbox:`,
      link,
    );

    await this.sendEmail(
      to,
      `New ${typeLabel} inquiry — ${inquiry.inquiry_number}`,
      lines.join('\n'),
    );
  }

  private get baseUrl(): string {
    return this.options.appUrl.replace(/\/+$/, '');
  }

  private async sendEmail(
    to: string | string[],
    subject: string,
    text: string,
  ): Promise<void> {
    const res = await fetch(ResendMailer.API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.options.from,
        to,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
    }
  }
}
