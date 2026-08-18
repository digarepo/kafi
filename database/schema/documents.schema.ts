import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  index,
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
import { registrations, travellers } from './travellers.schema.js';
import { users } from './iam.schema.js';

/**
 * Document types that classify an uploaded file.
 */
export const documentTypes = mysqlTable('document_types', {
  id: idColumn,
  type_code: codeColumn('type_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Document lifecycle statuses.
 */
export const documentStatuses = mysqlTable('document_statuses', {
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
 * Verification states applied by staff when reviewing a document.
 */
export const verificationStatuses = mysqlTable('verification_statuses', {
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
 * Visa application lifecycle statuses.
 */
export const visaApplicationStatuses = mysqlTable('visa_application_statuses', {
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
 * An uploaded file owned by a traveller and/or a registration.
 */
export const documents = mysqlTable(
  'documents',
  {
    id: idColumn,
    document_number: varchar('document_number', { length: 30 })
      .notNull()
      .unique(),
    display_name: varchar('display_name', { length: 255 }),
    traveller_id: fkUuid('traveller_id'),
    registration_id: fkUuid('registration_id'),
    document_type_id: fkUuid('document_type_id').notNull(),
    original_filename: varchar('original_filename', { length: 255 }),
    stored_filename: varchar('stored_filename', { length: 255 }),
    mime_type: varchar('mime_type', { length: 100 }),
    file_size: bigint('file_size', { mode: 'number' }).notNull().default(0),
    storage_path: text('storage_path'),
    verification_status_id: fkUuid('verification_status_id').notNull(),
    verified_by: fkUuid('verified_by'),
    verified_at: datetime('verified_at', { mode: 'date' }),
    expiry_date: date('expiry_date'),
    document_status_id: fkUuid('document_status_id').notNull(),
    remarks: text('remarks'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('documents_traveller_id_idx').on(table.traveller_id),
    index('documents_registration_id_idx').on(table.registration_id),
    index('documents_document_type_id_idx').on(table.document_type_id),
    index('documents_document_status_id_idx').on(table.document_status_id),
    index('documents_verification_status_id_idx').on(
      table.verification_status_id,
    ),
  ],
);

/**
 * A visa application for a single registration.
 *
 * At most one APPROVED row per registration is enforced at the service level
 * (assertNoApprovedVisa) per the DBML business rules.
 */
export const visaApplications = mysqlTable(
  'visa_applications',
  {
    id: idColumn,
    application_number: varchar('application_number', { length: 30 })
      .notNull()
      .unique(),
    registration_id: fkUuid('registration_id').notNull(),
    submission_date: date('submission_date'),
    approval_date: date('approval_date'),
    expiry_date: date('expiry_date'),
    visa_number: varchar('visa_number', { length: 100 }),
    visa_application_status_id: fkUuid('visa_application_status_id').notNull(),
    // Round 6: actual visa cost (supplier cost, not customer charge)
    visa_cost: decimal('visa_cost', { precision: 18, scale: 2 }),
    notes: text('notes'),
    rejection_date: date('rejection_date'),
    rejection_reason: text('rejection_reason'),
    cancellation_date: date('cancellation_date'),
    cancellation_reason: text('cancellation_reason'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('visa_applications_registration_id_idx').on(table.registration_id),
    index('visa_applications_status_id_idx').on(
      table.visa_application_status_id,
    ),
  ],
);

// Relations

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  documents: many(documents),
}));

export const documentStatusesRelations = relations(
  documentStatuses,
  ({ many }) => ({
    documents: many(documents),
  }),
);

export const verificationStatusesRelations = relations(
  verificationStatuses,
  ({ many }) => ({
    documents: many(documents),
  }),
);

export const visaApplicationStatusesRelations = relations(
  visaApplicationStatuses,
  ({ many }) => ({
    visaApplications: many(visaApplications),
  }),
);

export const documentsRelations = relations(documents, ({ one }) => ({
  traveller: one(travellers, {
    fields: [documents.traveller_id],
    references: [travellers.id],
  }),
  registration: one(registrations, {
    fields: [documents.registration_id],
    references: [registrations.id],
  }),
  documentType: one(documentTypes, {
    fields: [documents.document_type_id],
    references: [documentTypes.id],
  }),
  documentStatus: one(documentStatuses, {
    fields: [documents.document_status_id],
    references: [documentStatuses.id],
  }),
  verificationStatus: one(verificationStatuses, {
    fields: [documents.verification_status_id],
    references: [verificationStatuses.id],
  }),
  verifiedBy: one(users, {
    fields: [documents.verified_by],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [documents.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [documents.updated_by],
    references: [users.id],
  }),
}));

export const visaApplicationsRelations = relations(
  visaApplications,
  ({ one }) => ({
    registration: one(registrations, {
      fields: [visaApplications.registration_id],
      references: [registrations.id],
    }),
    status: one(visaApplicationStatuses, {
      fields: [visaApplications.visa_application_status_id],
      references: [visaApplicationStatuses.id],
    }),
    createdBy: one(users, {
      fields: [visaApplications.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [visaApplications.updated_by],
      references: [users.id],
    }),
  }),
);
