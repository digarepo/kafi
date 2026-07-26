import { Injectable, Inject } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import * as schema from '@kafi/database';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { OneTimeTokenRepository } from '../../application/ports/one-time-token.repository.js';
import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Drizzle ORM implementation for one-time email verification and password reset tokens.
 */
@Injectable()
export class DrizzleOneTimeTokenRepository implements OneTimeTokenRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async createEmailVerificationToken(
    userId: TypedId<'User'>,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.insert(schema.emailVerificationTokens).values({
      id: ulid(),
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
  }

  async consumeEmailVerificationToken(
    tokenHash: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({
        id: schema.emailVerificationTokens.id,
        user_id: schema.emailVerificationTokens.user_id,
        expires_at: schema.emailVerificationTokens.expires_at,
      })
      .from(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.token_hash, tokenHash))
      .limit(1);

    if (!row || row.expires_at.getTime() < Date.now()) {
      return null;
    }

    await this.db
      .delete(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.id, row.id));

    return row.user_id;
  }

  async createPasswordResetToken(
    userId: TypedId<'User'>,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.insert(schema.passwordResetTokens).values({
      id: ulid(),
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
  }

  async consumePasswordResetToken(
    tokenHash: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({
        id: schema.passwordResetTokens.id,
        user_id: schema.passwordResetTokens.user_id,
        expires_at: schema.passwordResetTokens.expires_at,
      })
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.token_hash, tokenHash))
      .limit(1);

    if (!row || row.expires_at.getTime() < Date.now()) {
      return null;
    }

    await this.db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.id, row.id));

    return row.user_id;
  }
}
