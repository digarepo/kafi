import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import * as schema from '../schema/index.js';

type DocumentsDb = MySql2Database<typeof schema>;

const DOCUMENT_TYPES = [
  {
    type_code: 'PASSPORT',
    name: 'Passport',
    description:
      'Traveller-owned personal identity document, reusable across trips.',
  },
  {
    type_code: 'FAYDA_ID',
    name: 'Fayda ID',
    description: 'Traveller-owned Ethiopian national identity card.',
  },
  {
    type_code: 'PHOTO',
    name: 'Photo',
    description: 'Traveller-owned personal identification photo.',
  },
  {
    type_code: 'VISA_COPY',
    name: 'Visa copy',
    description: 'Registration-owned copy of the issued Saudi visa.',
  },
  {
    type_code: 'PAYMENT_RECEIPT',
    name: 'Payment receipt',
    description: 'Registration-owned proof of payment.',
  },
  {
    type_code: 'VACCINATION_CERTIFICATE',
    name: 'Vaccination certificate',
    description: 'Traveller-owned health record.',
  },
  {
    type_code: 'OTHER',
    name: 'Other',
    description:
      'Context-dependent document; staff decide the owner at upload.',
  },
];

const DOCUMENT_STATUSES = [
  { status_code: 'PENDING', name: 'Pending' },
  { status_code: 'VALID', name: 'Valid' },
  { status_code: 'EXPIRED', name: 'Expired' },
  { status_code: 'REJECTED', name: 'Rejected' },
];

const VERIFICATION_STATUSES = [
  { status_code: 'PENDING', name: 'Pending' },
  { status_code: 'VERIFIED', name: 'Verified' },
  { status_code: 'REJECTED', name: 'Rejected' },
];

const VISA_APPLICATION_STATUSES = [
  { status_code: 'SUBMITTED', name: 'Submitted' },
  { status_code: 'APPROVED', name: 'Approved' },
  { status_code: 'REJECTED', name: 'Rejected' },
  { status_code: 'CANCELLED', name: 'Cancelled' },
];

const FLIGHT_BOOKING_STATUSES = [
  { status_code: 'CONFIRMED', name: 'Confirmed' },
  { status_code: 'CANCELLED', name: 'Cancelled' },
];

async function upsertTypeCodes(
  db: DocumentsDb,
  table: (typeof schema)['documentTypes'],
  rows: { type_code: string; name: string; description: string }[],
) {
  for (const row of rows) {
    await db
      .insert(table as any)
      .values({
        id: ulid(),
        type_code: row.type_code,
        name: row.name,
        description: row.description,
        is_active: true,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          description: row.description,
          is_active: true,
        },
      });
  }
}

async function upsertStatusCodes(
  db: DocumentsDb,
  table:
    | (typeof schema)['documentStatuses']
    | (typeof schema)['verificationStatuses']
    | (typeof schema)['visaApplicationStatuses']
    | (typeof schema)['flightBookingStatuses'],
  rows: { status_code: string; name: string }[],
) {
  for (const row of rows) {
    await db
      .insert(table as any)
      .values({
        id: ulid(),
        status_code: row.status_code,
        name: row.name,
        is_active: true,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: row.name,
          is_active: true,
        },
      });
  }
}

/**
 * Seeds Slice 7 documents and visa lookup values.
 */
export async function seedDocuments(db: DocumentsDb) {
  await upsertTypeCodes(db, schema.documentTypes, DOCUMENT_TYPES);

  await upsertStatusCodes(db, schema.documentStatuses, DOCUMENT_STATUSES);
  await upsertStatusCodes(
    db,
    schema.verificationStatuses,
    VERIFICATION_STATUSES,
  );
  await upsertStatusCodes(
    db,
    schema.visaApplicationStatuses,
    VISA_APPLICATION_STATUSES,
  );
  await upsertStatusCodes(
    db,
    schema.flightBookingStatuses,
    FLIGHT_BOOKING_STATUSES,
  );

  console.log('Documents, visa, and flight lookup data seeded successfully');
}
