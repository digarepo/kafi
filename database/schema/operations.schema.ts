import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
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
import { currencies } from './common.schema.js';
import { contactPersons, registrations } from './travellers.schema.js';
import { packageVersions } from './packages.schema.js';
import { users } from './iam.schema.js';

/**
 * Lifecycle states for travel groups: PLANNING, OPEN, CLOSED, DEPARTED,
 * COMPLETED, CANCELLED.
 */
export const travelGroupStatuses = mysqlTable('travel_group_statuses', {
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
 * Lifecycle states for group memberships: ACTIVE, CANCELLED, TRANSFERRED,
 * COMPLETED.
 */
export const groupMembershipStatuses = mysqlTable('group_membership_statuses', {
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
 * A physical departure group that executes a single package version.
 *
 * One package version may have many travel groups. Capacity on this table is
 * an operational allocation; commercial sales capacity lives on
 * `package_versions.max_capacity`.
 */
export const travelGroups = mysqlTable(
  'travel_groups',
  {
    id: idColumn,
    group_number: varchar('group_number', { length: 30 })
      .notNull()
      .unique(),
    package_version_id: fkUuid('package_version_id').notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    departure_date: date('departure_date'),
    return_date: date('return_date'),
    maximum_capacity: int('maximum_capacity').notNull(),
    travel_group_status_id: fkUuid('travel_group_status_id').notNull(),
    remarks: text('remarks'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('travel_groups_package_version_id_idx').on(table.package_version_id),
    index('travel_groups_status_id_idx').on(table.travel_group_status_id),
    index('travel_groups_departure_date_idx').on(table.departure_date),
  ],
);

/**
 * The operational participation of one registration in one travel group.
 *
 * A registration can have at most one active membership at a time. The
 * `guarantee_required` flag defaults to true and can be waived by staff.
 */
export const groupMemberships = mysqlTable(
  'group_memberships',
  {
    id: idColumn,
    travel_group_id: fkUuid('travel_group_id').notNull(),
    registration_id: fkUuid('registration_id').notNull(),
    group_membership_status_id: fkUuid('group_membership_status_id').notNull(),
    joined_at: datetime('joined_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    left_at: datetime('left_at', { mode: 'date' }),
    transferred_from_group_membership_id: fkUuid(
      'transferred_from_group_membership_id',
    ),
    guarantee_required: boolean('guarantee_required')
      .notNull()
      .default(true),
    guarantee_waived: boolean('guarantee_waived').notNull().default(false),
    guarantee_waived_by: fkUuid('guarantee_waived_by'),
    guarantee_waived_at: datetime('guarantee_waived_at', { mode: 'date' }),
    remarks: text('remarks'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('group_memberships_travel_group_id_idx').on(table.travel_group_id),
    index('group_memberships_registration_id_idx').on(table.registration_id),
    index('group_memberships_status_id_idx').on(
      table.group_membership_status_id,
    ),
  ],
);

/**
 * A concrete guarantee instrument attached to a group membership.
 *
 * At most one guarantee per membership can be ACTIVE at any time. A guarantee
 * may be replaced, creating a linked history chain through
 * `previous_guarantee_id` and `replaced_by_id`.
 */
export const guarantees = mysqlTable(
  'guarantees',
  {
    id: idColumn,
    guarantee_number: varchar('guarantee_number', { length: 30 })
      .notNull()
      .unique(),
    group_membership_id: fkUuid('group_membership_id').notNull(),
    registration_id: fkUuid('registration_id').notNull(),
    guarantee_type: mysqlEnum('guarantee_type', [
      'PERSON',
      'CASH_DEPOSIT',
      'CPO',
      'BANK_GUARANTEE',
    ]).notNull(),
    guarantee_status: mysqlEnum('guarantee_status', [
      'PENDING',
      'ACTIVE',
      'REPLACED',
      'RELEASED',
      'REFUNDED',
      'EXPIRED',
    ])
      .notNull()
      .default('PENDING'),
    contact_person_id: fkUuid('contact_person_id'),
    instrument_reference: varchar('instrument_reference', { length: 120 }).unique(),
    amount: decimal('amount', { precision: 18, scale: 2 }),
    currency_id: fkUuid('currency_id'),
    effective_date: date('effective_date'),
    expiry_date: date('expiry_date'),
    issuer: varchar('issuer', { length: 120 }),
    previous_guarantee_id: fkUuid('previous_guarantee_id'),
    replaced_by_id: fkUuid('replaced_by_id'),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('guarantees_group_membership_id_idx').on(table.group_membership_id),
    index('guarantees_registration_id_idx').on(table.registration_id),
    index('guarantees_status_idx').on(table.guarantee_status),
  ],
);

// Relations
export const travelGroupStatusesRelations = relations(
  travelGroupStatuses,
  ({ many }) => ({
    travelGroups: many(travelGroups),
  }),
);

export const groupMembershipStatusesRelations = relations(
  groupMembershipStatuses,
  ({ many }) => ({
    groupMemberships: many(groupMemberships),
  }),
);

export const travelGroupsRelations = relations(
  travelGroups,
  ({ one, many }) => ({
    packageVersion: one(packageVersions, {
      fields: [travelGroups.package_version_id],
      references: [packageVersions.id],
    }),
    status: one(travelGroupStatuses, {
      fields: [travelGroups.travel_group_status_id],
      references: [travelGroupStatuses.id],
    }),
    createdBy: one(users, {
      fields: [travelGroups.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [travelGroups.updated_by],
      references: [users.id],
    }),
    memberships: many(groupMemberships),
  }),
);

export const groupMembershipsRelations = relations(
  groupMemberships,
  ({ one, many }) => ({
    travelGroup: one(travelGroups, {
      fields: [groupMemberships.travel_group_id],
      references: [travelGroups.id],
    }),
    registration: one(registrations, {
      fields: [groupMemberships.registration_id],
      references: [registrations.id],
    }),
    status: one(groupMembershipStatuses, {
      fields: [groupMemberships.group_membership_status_id],
      references: [groupMembershipStatuses.id],
    }),
    transferredFrom: one(groupMemberships, {
      fields: [groupMemberships.transferred_from_group_membership_id],
      references: [groupMemberships.id],
    }),
    guaranteeWaivedBy: one(users, {
      fields: [groupMemberships.guarantee_waived_by],
      references: [users.id],
    }),
    createdBy: one(users, {
      fields: [groupMemberships.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [groupMemberships.updated_by],
      references: [users.id],
    }),
    guarantees: many(guarantees),
  }),
);

export const guaranteesRelations = relations(guarantees, ({ one }) => ({
  groupMembership: one(groupMemberships, {
    fields: [guarantees.group_membership_id],
    references: [groupMemberships.id],
  }),
  registration: one(registrations, {
    fields: [guarantees.registration_id],
    references: [registrations.id],
  }),
  contactPerson: one(contactPersons, {
    fields: [guarantees.contact_person_id],
    references: [contactPersons.id],
  }),
  currency: one(currencies, {
    fields: [guarantees.currency_id],
    references: [currencies.id],
  }),
  previousGuarantee: one(guarantees, {
    fields: [guarantees.previous_guarantee_id],
    references: [guarantees.id],
  }),
  replacedBy: one(guarantees, {
    fields: [guarantees.replaced_by_id],
    references: [guarantees.id],
  }),
  createdBy: one(users, {
    fields: [guarantees.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [guarantees.updated_by],
    references: [users.id],
  }),
}));
