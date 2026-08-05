import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  char,
  datetime,
  decimal,
  index,
  int,
  mysqlTable,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';

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

/**
 * Currencies used by packages and finance.
 */
export const currencies = mysqlTable('currencies', {
  id: idColumn,
  currency_code: codeColumn('currency_code'),
  name: nameColumn(),
  symbol: varchar('symbol', { length: 10 }),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Seasons used by package versions and operations.
 */
export const seasons = mysqlTable('seasons', {
  id: idColumn,
  season_code: codeColumn('season_code'),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Countries used by travellers and contact persons.
 */
export const countries = mysqlTable('countries', {
  id: idColumn,
  iso_code: varchar('iso_code', { length: 10 }).notNull().unique(),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Regions within a country.
 */
export const regions = mysqlTable(
  'regions',
  {
    id: idColumn,
    country_id: fkUuid('country_id').notNull(),
    region_code: codeColumn('region_code'),
    name: nameColumn(),
    is_active: boolean('is_active').notNull().default(true),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
);

/**
 * Languages used as communication preferences.
 */
export const languages = mysqlTable('languages', {
  id: idColumn,
  language_code: codeColumn('language_code'),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * GeoNames-sourced cities, scoped to a country and optionally a region.
 */
export const cities = mysqlTable(
  'cities',
  {
    id: idColumn,
    country_id: fkUuid('country_id').notNull(),
    region_id: fkUuid('region_id'),
    geoname_id: int('geoname_id').notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    population: int('population').notNull().default(0),
    is_active: boolean('is_active').notNull().default(true),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('cities_geoname_id_unique').on(table.geoname_id),
    index('cities_country_id_idx').on(table.country_id),
    index('cities_region_id_idx').on(table.region_id),
  ],
);

// Relations
export const countriesRelations = relations(countries, ({ many }) => ({
  regions: many(regions),
  cities: many(cities),
}));

export const regionsRelations = relations(regions, ({ one, many }) => ({
  country: one(countries, {
    fields: [regions.country_id],
    references: [countries.id],
  }),
  cities: many(cities),
}));

export const citiesRelations = relations(cities, ({ one }) => ({
  country: one(countries, {
    fields: [cities.country_id],
    references: [countries.id],
  }),
  region: one(regions, {
    fields: [cities.region_id],
    references: [regions.id],
  }),
}));
