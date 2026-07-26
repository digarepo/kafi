import { Injectable } from '@nestjs/common';
import { Mailer } from '../../application/ports/mailer.port.js';

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
}
