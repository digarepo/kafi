import 'dotenv/config';

import { createHash } from 'node:crypto';
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
  const migrationFileNames = readdirSync(migrationDir)
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort();
  const migrationFiles = migrationFileNames.map((name) => {
    const tag = name.replace(/\.sql$/, '');
    const hash = createHash('sha256')
      .update(readFileSync(resolve(migrationDir, name)))
      .digest('hex');
    return { tag, hash };
  });
  const journalTags = journal.entries.map((entry) => entry.tag);
  const journalTagSet = new Set(journalTags);
  const fileSet = new Set(migrationFiles.map((file) => file.tag));
  const fileByHash = new Map(
    migrationFiles.map((file) => [file.hash, file.tag]),
  );
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
    const appliedHashes = new Set(migrationRows.map((row) => String(row.hash)));
    const journalFilesNotApplied = journalTags.filter((tag) => {
      const file = migrationFiles.find((candidate) => candidate.tag === tag);
      return file ? !appliedHashes.has(file.hash) : false;
    });
    const appliedHashMismatches = migrationRows
      .filter((row) => !fileByHash.has(String(row.hash)))
      .map((row) => ({
        id: row.id,
        hash: row.hash,
        created_at: row.created_at,
      }));
    const report = {
      database: databaseName,
      journalPath,
      migrationFiles,
      journalTags,
      appliedCount: migrationRows.length,
      journalEntryCount: journal.entries.length,
      filesMissingFromJournal: migrationFiles
        .map((file) => file.tag)
        .filter((tag) => !journalTagSet.has(tag)),
      journalEntriesMissingFiles: journalTags.filter(
        (tag) => !fileSet.has(tag),
      ),
      journalFilesNotApplied,
      appliedHashMismatches,
      appliedMigrationRows: migrationRows.map((row) => ({
        id: row.id,
        hash: row.hash,
        matchingCurrentFile: fileByHash.get(String(row.hash)) ?? null,
        created_at: row.created_at,
      })),
      status: 'ok' as 'ok' | 'drift',
    };
    if (
      report.filesMissingFromJournal.length ||
      report.journalEntriesMissingFiles.length ||
      report.journalFilesNotApplied.length ||
      report.appliedHashMismatches.length
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
