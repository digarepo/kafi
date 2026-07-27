import { Injectable, Inject } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import * as schema from '@kafi/database';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import { RefreshTokenRepository } from '../../application/ports/refresh-token.repository.js';
import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Drizzle ORM implementation of the refresh-token blocklist.
 */
@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async block(
    tokenHash: string,
    userId: TypedId<'User'>,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.insert(schema.refreshTokenBlocklist).values({
      id: ulid(),
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    });
  }

  async isBlocked(tokenHash: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schema.refreshTokenBlocklist.id })
      .from(schema.refreshTokenBlocklist)
      .where(eq(schema.refreshTokenBlocklist.token_hash, tokenHash))
      .limit(1);

    return !!row;
  }
}
