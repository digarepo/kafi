import { Injectable, Inject } from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import * as schema from '@kafi/database';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';

/**
 * Input for a single audit log entry.
 */
export interface AuditLogEntry {
  userId?: string;
  event: string;
  success?: boolean;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Logs authentication and authorization events for later review.
 */
@Injectable()
export class AuditLogger {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.db.insert(schema.authAuditLogs).values({
      id: ulid(),
      user_id: entry.userId ?? null,
      event_type: entry.event,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      success: entry.success ?? true,
      details: entry.details ?? null,
    });
  }
}
