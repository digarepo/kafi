import "dotenv/config";

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import mysql from "mysql2/promise";

async function main() {
  const databaseName =
    process.env.KAFI_MIGRATION_DATABASE ?? process.env.DATABASE_NAME ?? "kafi_dev";
  const repoRoot = process.cwd();
  const migrationDir = resolve(repoRoot, "database/migrations");
  const journalPath = resolve(migrationDir, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };
  const migrationFileNames = readdirSync(migrationDir)
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort();
  const migrationFiles = migrationFileNames.map((name) => {
    const tag = name.replace(/\.sql$/, "");
    const hash = createHash("sha256")
      .update(readFileSync(resolve(migrationDir, name)))
      .digest("hex");
    return { tag, hash };
  });
  const journalTags = journal.entries.map((entry) => entry.tag);
  const journalTagSet = new Set(journalTags);
  const fileSet = new Set(migrationFiles.map((file) => file.tag));
  const fileByHash = new Map(migrationFiles.map((file) => [file.hash, file.tag]));
  // Historical exception: this hash is recorded in kafi_dev for migration
  // 0009, but the original SQL contents could not be recovered from Git.
  // Preserve the database hash and report the exception explicitly.
  const knownLegacyHashes = new Map<string, string>([
    [
      "ebea5ad7950f2a94e4747792ef7df9c112ee84c3b2e4370fe0ca74ade6c883c2",
      "0009_fantastic_night_thrasher",
    ],
  ]);

  const recognizedTagForHash = (hash: string): string | null =>
    fileByHash.get(hash) ?? knownLegacyHashes.get(hash) ?? null;

  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? "3306"),
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: databaseName,
  });

  try {
    const [migrationRows] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id"
    );
    const appliedTags = new Set(
      migrationRows
        .map((row) => recognizedTagForHash(String(row.hash)))
        .filter((tag): tag is string => tag !== null)
    );

    const journalFilesNotApplied = journalTags.filter((tag) => !appliedTags.has(tag));

    const appliedHashMismatches = migrationRows
      .filter((row) => !recognizedTagForHash(String(row.hash)))
      .map((row) => ({
        id: row.id,
        hash: row.hash,
        created_at: row.created_at,
      }));

    const knownLegacyHashExceptions = migrationRows
      .filter((row) => knownLegacyHashes.has(String(row.hash)))
      .map((row) => {
        const hash = String(row.hash);
        const tag = knownLegacyHashes.get(hash)!;
        const currentFile = migrationFiles.find((file) => file.tag === tag);

        return {
          id: row.id,
          hash,
          recognizedMigration: tag,
          currentFileHash: currentFile?.hash ?? null,
          created_at: row.created_at,
        };
      });
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
      journalEntriesMissingFiles: journalTags.filter((tag) => !fileSet.has(tag)),
      journalFilesNotApplied,
      appliedHashMismatches,
      knownLegacyHashExceptions,
      appliedMigrationRows: migrationRows.map((row) => ({
        id: row.id,
        hash: row.hash,
        matchingCurrentFile: fileByHash.get(String(row.hash)) ?? null,
        created_at: row.created_at,
      })),
      status: "ok" as "ok" | "drift" | "ok_with_known_legacy_exceptions",
    };
    if (
      report.filesMissingFromJournal.length ||
      report.journalEntriesMissingFiles.length ||
      report.journalFilesNotApplied.length ||
      report.appliedHashMismatches.length
    ) {
      report.status = "drift";
    } else if (report.knownLegacyHashExceptions.length > 0) {
      report.status = "ok_with_known_legacy_exceptions";
    }
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "drift") process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
