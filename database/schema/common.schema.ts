import { sql } from 'drizzle-orm';
import { boolean, char, datetime, varchar } from 'drizzle-orm/mysql-core';

/**
 * Standard ULID primary key column used by every domain table.
 */
export const idColumn = char('id', { length: 26 }).primaryKey();

/**
 * Creates a standard 26-character foreign key column referencing a ULID primary key.
 *
 * @param name - The column name.
 */
export function fkUuid(name: string) {
  return char(name, { length: 26 });
}

/**
 * Standard audit timestamp columns for row metadata.
 */
export const auditMetadata = {
  created_at: datetime({ mode: 'date' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: datetime({ mode: 'date' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
} as const;

/**
 * Standard soft-delete columns.
 */
export const softDeleteMetadata = {
  is_deleted: boolean('is_deleted').notNull().default(false),
  deleted_at: datetime({ mode: 'date' }),
} as const;

/**
 * Standard actor columns for created_by / updated_by.
 */
export const actorMetadata = {
  created_by: fkUuid('created_by'),
  updated_by: fkUuid('updated_by'),
} as const;

/**
 * Creates a standard code column for lookup tables.
 *
 * @param name - The column name.
 */
export function codeColumn(name = 'code') {
  return varchar(name, { length: 30 }).notNull().unique();
}

/**
 * Creates a standard name column for lookup tables.
 *
 * @param name - The column name.
 */
export function nameColumn(name = 'name') {
  return varchar(name, { length: 100 }).notNull();
}
