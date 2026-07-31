/**
 * Port for sending transactional emails such as verification and reset links.
 *
 * A production deployment should provide an SMTP-backed implementation.
 */
export abstract class Mailer {
  abstract sendVerificationEmail(to: string, token: string): Promise<void>;
  abstract sendPasswordResetEmail(to: string, token: string): Promise<void>;
  abstract sendWelcomeEmail(
    to: string,
    temporaryPassword: string,
  ): Promise<void>;
}
