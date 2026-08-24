import { Injectable } from '@nestjs/common';
import {
  Mailer,
  type InquiryNotification,
} from '../../application/ports/mailer.port.js';

/**
 * Development-only mailer that prints tokens to stdout.
 *
 * Production sends via {@link ResendMailer}; this is used when MAILER_DRIVER=console.
 */
@Injectable()
export class ConsoleMailer implements Mailer {
  async sendVerificationEmail(to: string, token: string): Promise<void> {
    console.log(`[Verification email] to=${to} token=${token}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    console.log(`[Password reset email] to=${to} token=${token}`);
  }

  async sendWelcomeEmail(to: string, temporaryPassword: string): Promise<void> {
    console.log(
      `[Welcome email] to=${to} temporary_password=${temporaryPassword}`,
    );
  }

  async sendInquiryNotification(
    to: string[],
    inquiry: InquiryNotification,
  ): Promise<void> {
    // Printed as a readable block so the development flow is observable
    // end-to-end without a real mail provider.
    console.log(
      [
        `[Inquiry notification] to=${to.join(', ')}`,
        `  number:   ${inquiry.inquiry_number}`,
        `  type:     ${inquiry.inquiry_type}`,
        `  name:     ${inquiry.full_name ?? '-'}`,
        `  phone:    ${inquiry.phone_number}`,
        `  email:    ${inquiry.email_address ?? '-'}`,
        `  category: ${inquiry.enquiry_category ?? '-'}`,
        `  package:  ${inquiry.package_interest ?? '-'}`,
        `  service:  ${inquiry.service_interest ?? '-'}`,
        `  period:   ${inquiry.travel_period ?? '-'}`,
        `  group:    ${inquiry.group_size ?? '-'}`,
        `  source:   ${inquiry.source_channel ?? '-'}`,
        `  message:  ${inquiry.message ?? '-'}`,
      ].join('\n'),
    );
  }
}
