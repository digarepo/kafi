import { Injectable } from '@nestjs/common';
import { Mailer } from '../../application/ports/mailer.port.js';

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

  private get baseUrl(): string {
    return this.options.appUrl.replace(/\/+$/, '');
  }

  private async sendEmail(
    to: string,
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
