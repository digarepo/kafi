import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Port for persisting one-time tokens for email verification and password reset.
 */
export abstract class OneTimeTokenRepository {
  /**
   * Stores a hash of an email verification token.
   */
  abstract createEmailVerificationToken(
    userId: TypedId<'User'>,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * Validates an email verification token hash and returns the user id.
   *
   * @returns User id, or null if invalid/expired.
   */
  abstract consumeEmailVerificationToken(
    tokenHash: string,
  ): Promise<string | null>;

  /**
   * Stores a hash of a password reset token.
   */
  abstract createPasswordResetToken(
    userId: TypedId<'User'>,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * Validates a password reset token hash and returns the user id.
   *
   * @returns User id, or null if invalid/expired.
   */
  abstract consumePasswordResetToken(
    tokenHash: string,
  ): Promise<string | null>;
}
