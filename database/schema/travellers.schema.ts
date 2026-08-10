import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  datetime,
  int,
  mysqlEnum,
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
import { countries, languages, regions } from './common.schema.js';
import { users } from './iam.schema.js';
import { packageVersions } from './packages.schema.js';

/**
 * Lifecycle states for travellers: Active, Inactive, Blacklisted.
 */
export const travellerStatuses = mysqlTable('traveller_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Sources that introduced a traveller to the agency.
 */
export const travellerSources = mysqlTable('traveller_sources', {
  id: idColumn,
  source_code: codeColumn('source_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Relationship types used for traveller contacts.
 */
export const relationshipTypes = mysqlTable('relationship_types', {
  id: idColumn,
  relationship_code: codeColumn('relationship_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for reusable contact persons.
 */
export const contactPersonStatuses = mysqlTable('contact_person_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lifecycle states for the traveller/contact link.
 */
export const travellerContactStatuses = mysqlTable(
  'traveller_contact_statuses',
  {
    id: idColumn,
    status_code: codeColumn('status_code'),
    name: nameColumn(),
    description: text('description'),
    display_order: int('display_order').notNull().default(1),
    is_active: boolean('is_active').notNull().default(true),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
);

/**
 * Lifecycle states for a registration.
 */
export const registrationStatuses = mysqlTable('registration_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Master traveller profile.
 */
export const travellers = mysqlTable(
  'travellers',
  {
    id: idColumn,
    traveller_number: varchar('traveller_number', { length: 30 })
      .notNull()
      .unique(),
    first_name: varchar('first_name', { length: 100 }).notNull(),
    middle_name: varchar('middle_name', { length: 100 }),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    gender: mysqlEnum('gender', ['Female', 'Male']).notNull(),
    date_of_birth: date('date_of_birth'),
    phone_number: varchar('phone_number', { length: 30 }).notNull(),
    email_address: varchar('email_address', { length: 255 }),
    passport_number: varchar('passport_number', { length: 50 }).unique(),
    fayda_number: varchar('fayda_number', { length: 50 }).unique(),
    country_id: fkUuid('country_id').notNull(),
    region_id: fkUuid('region_id'),
    preferred_language_id: fkUuid('preferred_language_id'),
    traveller_source_id: fkUuid('traveller_source_id'),
    traveller_status_id: fkUuid('traveller_status_id').notNull(),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
);

/**
 * Independent reusable contact profile.
 */
export const contactPersons = mysqlTable(
  'contact_persons',
  {
    id: idColumn,
    first_name: varchar('first_name', { length: 100 }).notNull(),
    middle_name: varchar('middle_name', { length: 100 }),
    last_name: varchar('last_name', { length: 100 }).notNull(),
    gender: mysqlEnum('gender', ['Female', 'Male']),
    date_of_birth: date('date_of_birth'),
    phone_number: varchar('phone_number', { length: 30 }).notNull().unique(),
    alternate_phone_number: varchar('alternate_phone_number', { length: 30 }),
    email_address: varchar('email_address', { length: 255 }),
    address: text('address'),
    country_id: fkUuid('country_id'),
    region_id: fkUuid('region_id'),
    preferred_language_id: fkUuid('preferred_language_id'),
    contact_person_status_id: fkUuid('contact_person_status_id').notNull(),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
);

/**
 * Resolves the many-to-many relationship between travellers and contact persons.
 */
export const travellerContacts = mysqlTable(
  'traveller_contacts',
  {
    id: idColumn,
    traveller_id: fkUuid('traveller_id').notNull(),
    contact_person_id: fkUuid('contact_person_id').notNull(),
    relationship_type_id: fkUuid('relationship_type_id').notNull(),
    is_emergency_contact: boolean('is_emergency_contact')
      .notNull()
      .default(false),
    is_primary_contact: boolean('is_primary_contact').notNull().default(false),
    priority: int('priority').notNull().default(1),
    notes: text('notes'),
    traveller_contact_status_id: fkUuid(
      'traveller_contact_status_id',
    ).notNull(),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('traveller_contacts_traveller_contact_priority_unique').on(
      table.traveller_id,
      table.contact_person_id,
      table.priority,
    ),
    unique('traveller_contacts_traveller_priority_unique').on(
      table.traveller_id,
      table.priority,
    ),
  ],
);

/**
 * Represents a traveller purchasing a specific package version.
 */
export const registrations = mysqlTable(
  'registrations',
  {
    id: idColumn,
    registration_number: varchar('registration_number', { length: 30 })
      .notNull()
      .unique(),
    traveller_id: fkUuid('traveller_id').notNull(),
    package_version_id: fkUuid('package_version_id').notNull(),
    registration_date: datetime('registration_date', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expected_departure_date: date('expected_departure_date'),
    expected_return_date: date('expected_return_date'),
    registration_status_id: fkUuid('registration_status_id').notNull(),
    cancellation_reason: text('cancellation_reason'),
    cancelled_at: datetime('cancelled_at', { mode: 'date' }),
    cancelled_by: fkUuid('cancelled_by'),
    remarks: text('remarks'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [],
);

// Relations
export const travellerStatusesRelations = relations(
  travellerStatuses,
  ({ many }) => ({
    travellers: many(travellers),
  }),
);

export const travellerSourcesRelations = relations(
  travellerSources,
  ({ many }) => ({
    travellers: many(travellers),
  }),
);

export const relationshipTypesRelations = relations(
  relationshipTypes,
  ({ many }) => ({
    travellerContacts: many(travellerContacts),
  }),
);

export const contactPersonStatusesRelations = relations(
  contactPersonStatuses,
  ({ many }) => ({
    contactPersons: many(contactPersons),
  }),
);

export const travellerContactStatusesRelations = relations(
  travellerContactStatuses,
  ({ many }) => ({
    travellerContacts: many(travellerContacts),
  }),
);

export const registrationStatusesRelations = relations(
  registrationStatuses,
  ({ many }) => ({
    registrations: many(registrations),
  }),
);

export const travellersRelations = relations(travellers, ({ one, many }) => ({
  country: one(countries, {
    fields: [travellers.country_id],
    references: [countries.id],
  }),
  region: one(regions, {
    fields: [travellers.region_id],
    references: [regions.id],
  }),
  preferredLanguage: one(languages, {
    fields: [travellers.preferred_language_id],
    references: [languages.id],
  }),
  source: one(travellerSources, {
    fields: [travellers.traveller_source_id],
    references: [travellerSources.id],
  }),
  status: one(travellerStatuses, {
    fields: [travellers.traveller_status_id],
    references: [travellerStatuses.id],
  }),
  createdBy: one(users, {
    fields: [travellers.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [travellers.updated_by],
    references: [users.id],
  }),
  contacts: many(travellerContacts),
  registrations: many(registrations),
}));

export const contactPersonsRelations = relations(
  contactPersons,
  ({ one, many }) => ({
    country: one(countries, {
      fields: [contactPersons.country_id],
      references: [countries.id],
    }),
    region: one(regions, {
      fields: [contactPersons.region_id],
      references: [regions.id],
    }),
    preferredLanguage: one(languages, {
      fields: [contactPersons.preferred_language_id],
      references: [languages.id],
    }),
    status: one(contactPersonStatuses, {
      fields: [contactPersons.contact_person_status_id],
      references: [contactPersonStatuses.id],
    }),
    createdBy: one(users, {
      fields: [contactPersons.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [contactPersons.updated_by],
      references: [users.id],
    }),
    travellerContacts: many(travellerContacts),
  }),
);

export const travellerContactsRelations = relations(
  travellerContacts,
  ({ one }) => ({
    traveller: one(travellers, {
      fields: [travellerContacts.traveller_id],
      references: [travellers.id],
    }),
    contactPerson: one(contactPersons, {
      fields: [travellerContacts.contact_person_id],
      references: [contactPersons.id],
    }),
    relationshipType: one(relationshipTypes, {
      fields: [travellerContacts.relationship_type_id],
      references: [relationshipTypes.id],
    }),
    status: one(travellerContactStatuses, {
      fields: [travellerContacts.traveller_contact_status_id],
      references: [travellerContactStatuses.id],
    }),
    createdBy: one(users, {
      fields: [travellerContacts.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [travellerContacts.updated_by],
      references: [users.id],
    }),
  }),
);

export const registrationsRelations = relations(registrations, ({ one }) => ({
  traveller: one(travellers, {
    fields: [registrations.traveller_id],
    references: [travellers.id],
  }),
  packageVersion: one(packageVersions, {
    fields: [registrations.package_version_id],
    references: [packageVersions.id],
  }),
  status: one(registrationStatuses, {
    fields: [registrations.registration_status_id],
    references: [registrationStatuses.id],
  }),
  createdBy: one(users, {
    fields: [registrations.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [registrations.updated_by],
    references: [users.id],
  }),
}));
