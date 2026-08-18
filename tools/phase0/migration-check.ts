import 'dotenv/config';

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

async function main() {
  const databaseName =
    process.env.KAFI_MIGRATION_DATABASE ??
    process.env.DATABASE_NAME ??
    'kafi_dev';
  const repoRoot = process.cwd();
  const migrationDir = resolve(repoRoot, 'database/migrations');
  const journalPath = resolve(migrationDir, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };
  const migrationFiles = readdirSync(migrationDir)
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .map((name) => name.replace(/\.sql$/, ''))
    .sort();
  const journalTags = journal.entries.map((entry) => entry.tag);
  const journalTagSet = new Set(journalTags);
  const fileSet = new Set(migrationFiles);
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? '3306'),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: databaseName,
  });

  try {
    const [migrationRows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id',
    );
    const report = {
      database: databaseName,
      journalPath,
      migrationFiles,
      journalTags,
      appliedCount: migrationRows.length,
      journalEntryCount: journal.entries.length,
      filesMissingFromJournal: migrationFiles.filter(
        (tag) => !journalTagSet.has(tag),
      ),
      journalEntriesMissingFiles: journalTags.filter(
        (tag) => !fileSet.has(tag),
      ),
      appliedMigrationRows: migrationRows.map((row) => ({
        id: row.id,
        hash: row.hash,
        created_at: row.created_at,
      })),
      status: 'ok' as 'ok' | 'drift',
    };
    if (
      report.filesMissingFromJournal.length ||
      report.journalEntriesMissingFiles.length
    ) {
      report.status = 'drift';
    }
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'ok') process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
