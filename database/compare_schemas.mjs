#!/usr/bin/env node
/**
 * Compares the local database schema against a remote database
 * and prints the SQL statements needed to bring the remote up to date.
 *
 * Usage:
 *   REMOTE_DB_HOST=... REMOTE_DB_PORT=... REMOTE_DB_USER=... REMOTE_DB_PASSWORD=... REMOTE_DB_NAME=... \
 *     node database/compare_schemas.mjs
 *
 * It will:
 *   1. Read all tables + columns from both local and remote
 *   2. Print tables missing on remote (with CREATE TABLE statements)
 *   3. Print columns missing on remote (with ALTER TABLE statements)
 *   4. Print columns with different definitions (with ALTER TABLE statements)
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

const localConfig = {
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? 'root',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'kafi_dev',
};

const remoteConfig = {
  host: process.env.REMOTE_DB_HOST,
  port: Number(process.env.REMOTE_DB_PORT ?? 3306),
  user: process.env.REMOTE_DB_USER,
  password: process.env.REMOTE_DB_PASSWORD,
  database: process.env.REMOTE_DB_NAME,
};

if (!remoteConfig.host || !remoteConfig.user || !remoteConfig.database) {
  console.error('ERROR: Set REMOTE_DB_HOST, REMOTE_DB_USER, REMOTE_DB_NAME (and optionally REMOTE_DB_PORT, REMOTE_DB_PASSWORD)');
  process.exit(1);
}

async function getSchema(conn) {
  const [cols] = await conn.execute(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME != '__drizzle_migrations'
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const [tables] = await conn.execute(`
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME != '__drizzle_migrations'
  `);
  const schema = {};
  for (const t of tables) {
    const name = t.TABLE_NAME;
    schema[name] = {};
  }
  for (const c of cols) {
    const t = c.TABLE_NAME;
    if (!schema[t]) schema[t] = {};
    schema[t][c.COLUMN_NAME] = {
      type: c.COLUMN_TYPE,
      nullable: c.IS_NULLABLE === 'YES',
      default: c.COLUMN_DEFAULT,
      extra: c.EXTRA || '',
    };
  }
  return schema;
}

async function getCreateTable(conn, table) {
  const [r] = await conn.execute(`SHOW CREATE TABLE \`${table}\``);
  return r[0]['Create Table'];
}

async function main() {
  console.log('Connecting to local database:', localConfig.database);
  const localConn = await mysql.createConnection(localConfig);
  console.log('Connecting to remote database:', remoteConfig.database, 'on', remoteConfig.host);
  const remoteConn = await mysql.createConnection(remoteConfig);

  const localSchema = await getSchema(localConn);
  const remoteSchema = await getSchema(remoteConn);

  const localTables = Object.keys(localSchema).sort();
  const remoteTables = Object.keys(remoteSchema).sort();

  const missingTables = localTables.filter(t => !remoteTables.includes(t));
  const extraTables = remoteTables.filter(t => !localTables.includes(t));
  const commonTables = localTables.filter(t => remoteTables.includes(t));

  const statements = [];

  // Missing tables
  if (missingTables.length > 0) {
    console.log('\n=== MISSING TABLES ON REMOTE ===');
    for (const table of missingTables) {
      const ddl = await getCreateTable(localConn, table);
      statements.push(`-- Missing table: ${table}\n${ddl};\n`);
      console.log(`  ${table}`);
    }
  }

  // Missing/different columns on common tables
  if (commonTables.length > 0) {
    console.log('\n=== COLUMN DIFFS (common tables) ===');
    for (const table of commonTables) {
      const localCols = localSchema[table];
      const remoteCols = remoteSchema[table];
      const localColNames = Object.keys(localCols);
      const remoteColNames = Object.keys(remoteCols);

      // Missing columns on remote
      for (const colName of localColNames) {
        if (!remoteColNames.includes(colName)) {
          const c = localCols[colName];
          const nullStr = c.nullable ? 'NULL' : 'NOT NULL';
          const defaultStr = c.default !== null ? ` DEFAULT ${c.default}` : '';
          const extraStr = c.extra ? ` ${c.extra}` : '';
          statements.push(`ALTER TABLE \`${table}\` ADD COLUMN \`${colName}\` ${c.type} ${nullStr}${defaultStr}${extraStr};`);
          console.log(`  ${table}.${colName} — MISSING on remote`);
        }
      }

      // Different columns
      for (const colName of localColNames) {
        if (remoteColNames.includes(colName)) {
          const lc = localCols[colName];
          const rc = remoteCols[colName];
          const changed =
            lc.type !== rc.type ||
            lc.nullable !== rc.nullable ||
            lc.extra !== rc.extra;
          if (changed) {
            const nullStr = lc.nullable ? 'NULL' : 'NOT NULL';
            const defaultStr = lc.default !== null ? ` DEFAULT ${lc.default}` : '';
            const extraStr = lc.extra ? ` ${lc.extra}` : '';
            statements.push(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${colName}\` ${lc.type} ${nullStr}${defaultStr}${extraStr};`);
            console.log(`  ${table}.${colName} — CHANGED (local: ${lc.type} ${nullStr} | remote: ${rc.type} ${rc.nullable ? 'NULL' : 'NOT NULL'})`);
          }
        }
      }
    }
  }

  // Extra tables on remote (informational only)
  if (extraTables.length > 0) {
    console.log('\n=== EXTRA TABLES ON REMOTE (not in local) ===');
    for (const table of extraTables) {
      console.log(`  ${table}`);
    }
  }

  // Output the migration SQL
  if (statements.length > 0) {
    console.log('\n\n=== MIGRATION SQL ===\n');
    console.log('-- Generated: ' + new Date().toISOString());
    console.log('-- Brings remote database in sync with local schema\n');
    for (const s of statements) {
      console.log(s);
    }
  } else {
    console.log('\n✓ Remote database is in sync with local. No migration needed.');
  }

  await localConn.end();
  await remoteConn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
