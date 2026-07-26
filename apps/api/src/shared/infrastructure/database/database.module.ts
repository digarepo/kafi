import { Global, Module } from '@nestjs/common';
import { databaseProvider, DATABASE } from './database.provider.js';

/**
 * Global database module. Exposes the Drizzle database instance using the
 * DATABASE injection token.
 */
@Global()
@Module({
  providers: [databaseProvider],
  exports: [DATABASE],
})
export class DatabaseModule {}
