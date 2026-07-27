import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for MariaDB.
 *
 * Expects DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, and
 * DATABASE_NAME to be available in the environment.
 */
export default defineConfig({
  schema: './database/schema/index.ts',
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? '3306'),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'kafi_dev',
  },
});
