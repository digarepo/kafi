-- ============================================================
-- Kafi Database — Remote Schema Inspection
-- ============================================================
-- Run this against the REMOTE database to see all tables and
-- their columns. Compare with the local schema to identify
-- what's missing and needs to be migrated.
-- ============================================================

-- 1. List all tables (excluding __drizzle_migrations)
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  ENGINE,
  TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME != '__drizzle_migrations'
ORDER BY TABLE_NAME;

-- 2. List all columns for all tables
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY,
  COLUMN_DEFAULT,
  EXTRA,
  ORDINAL_POSITION
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME != '__drizzle_migrations'
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 3. List all indexes
SELECT
  TABLE_NAME,
  INDEX_NAME,
  COLUMN_NAME,
  NON_UNIQUE,
  SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME != '__drizzle_migrations'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 4. List all foreign keys
SELECT
  TABLE_NAME,
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;

-- 5. Show applied migrations
SELECT id, hash, FROM_UNIXTIME(created_at) as applied_at
FROM __drizzle_migrations
ORDER BY id;
