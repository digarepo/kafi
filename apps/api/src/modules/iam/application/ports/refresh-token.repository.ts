import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Port for persisting and querying revoked refresh tokens.
 */
export abstract class RefreshTokenRepository {
  /**
   * Records a refresh token hash as revoked.
   *
   * @param tokenHash - SHA-256 hash of the token.
   * @param userId - User that owns the token.
   * @param expiresAt - Token expiry time.
   */
  abstract block(
    tokenHash: string,
    userId: TypedId<'User'>,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * Checks whether a token hash has been revoked.
   *
   * @param tokenHash - SHA-256 hash of the token.
   * @returns True if the token is revoked.
   */
  abstract isBlocked(tokenHash: string): Promise<boolean>;
}
