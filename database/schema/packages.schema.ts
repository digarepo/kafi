import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  datetime,
  decimal,
  int,
  mysqlTable,
  text,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import {
  actorMetadata,
  auditMetadata,
  codeColumn,
  fkUuid,
  idColumn,
  nameColumn,
  softDeleteMetadata,
} from './common.schema.js';
import { currencies, seasons } from './common.schema.js';
import { users } from './iam.schema.js';

/**
 * Package version lifecycle statuses: DRAFT, PUBLISHED, CLOSED, CANCELLED.
 */
export const packageVersionStatuses = mysqlTable('package_version_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Sellable package categories such as ECONOMY, STANDARD, PREMIUM, VIP.
 */
export const packageCategories = mysqlTable('package_categories', {
  id: idColumn,
  category_code: codeColumn('category_code'),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Pilgrimage or trip types such as UMRAH, HAJJ, TOURISM.
 */
export const pilgrimageTypes = mysqlTable('pilgrimage_types', {
  id: idColumn,
  pilgrimage_type_code: codeColumn('pilgrimage_type_code'),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Package templates — reusable blueprints for package versions.
 */
export const packageTemplates = mysqlTable(
  'package_templates',
  {
    id: idColumn,
    package_template_code: varchar('package_template_code', { length: 30 })
      .notNull()
      .unique(),
    name: varchar('name', { length: 150 }).notNull(),
    short_name: varchar('short_name', { length: 50 }),
    description: text('description'),
    pilgrimage_type_id: fkUuid('pilgrimage_type_id').notNull(),
    package_category_id: fkUuid('package_category_id').notNull(),
    default_duration_days: int('default_duration_days').notNull(),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
);

/**
 * Sellable package versions derived from a template.
 */
export const packageVersions = mysqlTable(
  'package_versions',
  {
    id: idColumn,
    package_version_code: varchar('package_version_code', { length: 30 })
      .notNull()
      .unique(),
    package_template_id: fkUuid('package_template_id').notNull(),
    version_name: varchar('version_name', { length: 150 }).notNull(),
    version_number: int('version_number').notNull(),
    slug: varchar('slug', { length: 200 }).notNull().unique(),
    hero_image_url: varchar('hero_image_url', { length: 500 }),
    sort_order: int('sort_order').notNull().default(0),
    season_id: fkUuid('season_id'),
    year: int('year').notNull(),
    departure_date: date('departure_date'),
    return_date: date('return_date'),
    base_price: decimal('base_price', { precision: 18, scale: 2 }).notNull(),
    currency_id: fkUuid('currency_id').notNull(),
    max_capacity: int('max_capacity'),
    published_at: datetime('published_at', { mode: 'date' }),
    sales_start_date: date('sales_start_date'),
    sales_end_date: date('sales_end_date'),
    package_version_status_id: fkUuid('package_version_status_id').notNull(),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('package_versions_template_version_number_unique').on(
      table.package_template_id,
      table.version_number,
    ),
  ],
);

/**
 * Package version inclusions / features list.
 */
export const packageVersionInclusions = mysqlTable(
  'package_version_inclusions',
  {
    id: idColumn,
    package_version_id: fkUuid('package_version_id').notNull(),
    inclusion_text: varchar('inclusion_text', { length: 255 }).notNull(),
    display_order: int('display_order').notNull().default(1),
    is_highlighted: boolean('is_highlighted').notNull().default(false),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('package_version_inclusions_order_unique').on(
      table.package_version_id,
      table.display_order,
    ),
  ],
);

// Relations
export const packageTemplatesRelations = relations(
  packageTemplates,
  ({ one, many }) => ({
    pilgrimageType: one(pilgrimageTypes, {
      fields: [packageTemplates.pilgrimage_type_id],
      references: [pilgrimageTypes.id],
    }),
    packageCategory: one(packageCategories, {
      fields: [packageTemplates.package_category_id],
      references: [packageCategories.id],
    }),
    createdBy: one(users, {
      fields: [packageTemplates.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [packageTemplates.updated_by],
      references: [users.id],
    }),
    versions: many(packageVersions),
  }),
);

export const packageVersionsRelations = relations(
  packageVersions,
  ({ one, many }) => ({
    packageTemplate: one(packageTemplates, {
      fields: [packageVersions.package_template_id],
      references: [packageTemplates.id],
    }),
    packageVersionStatus: one(packageVersionStatuses, {
      fields: [packageVersions.package_version_status_id],
      references: [packageVersionStatuses.id],
    }),
    season: one(seasons, {
      fields: [packageVersions.season_id],
      references: [seasons.id],
    }),
    currency: one(currencies, {
      fields: [packageVersions.currency_id],
      references: [currencies.id],
    }),
    createdBy: one(users, {
      fields: [packageVersions.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [packageVersions.updated_by],
      references: [users.id],
    }),
    inclusions: many(packageVersionInclusions),
  }),
);

export const packageVersionInclusionsRelations = relations(
  packageVersionInclusions,
  ({ one }) => ({
    packageVersion: one(packageVersions, {
      fields: [packageVersionInclusions.package_version_id],
      references: [packageVersions.id],
    }),
    createdBy: one(users, {
      fields: [packageVersionInclusions.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [packageVersionInclusions.updated_by],
      references: [users.id],
    }),
  }),
);

export const packageVersionStatusesRelations = relations(
  packageVersionStatuses,
  ({ many }) => ({
    packageVersions: many(packageVersions),
  }),
);

export const packageCategoriesRelations = relations(
  packageCategories,
  ({ many }) => ({
    packageTemplates: many(packageTemplates),
  }),
);

export const pilgrimageTypesRelations = relations(
  pilgrimageTypes,
  ({ many }) => ({
    packageTemplates: many(packageTemplates),
  }),
);
