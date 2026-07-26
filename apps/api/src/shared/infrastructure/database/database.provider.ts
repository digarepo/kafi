import { Provider } from '@nestjs/common';
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { ConfigService } from '../config/config.service.js';
import * as schema from '@kafi/database';

/**
 * Injection token for the Drizzle database instance.
 */
export const DATABASE = Symbol('DATABASE');

/**
 * Provider that creates a single MySQL connection pool and a Drizzle ORM
 * instance for the application lifetime.
 */
export const databaseProvider: Provider = {
  provide: DATABASE,
  useFactory: (config: ConfigService): MySql2Database<typeof schema> => {
    const pool = mysql.createPool({
      host: config.get('DATABASE_HOST'),
      port: config.get('DATABASE_PORT'),
      user: config.get('DATABASE_USER'),
      password: config.get('DATABASE_PASSWORD'),
      database: config.get('DATABASE_NAME'),
      multipleStatements: true,
      connectionLimit: 10,
    });

    return drizzle(pool, { schema, mode: 'default' });
  },
  inject: [ConfigService],
};
