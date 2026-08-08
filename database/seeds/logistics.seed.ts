import { MySql2Database } from 'drizzle-orm/mysql2';
import { ulid } from 'ulid';
import * as schema from '../schema/index.js';

type LogisticsDb = MySql2Database<typeof schema>;

const HOTEL_TYPES = [
  { type_code: 'CITY', name: 'City' },
  { type_code: 'SHOPPING_DISTRICT', name: 'Shopping District' },
  { type_code: 'NEAR_HARAM', name: 'Near Haram' },
];

const ROOM_TYPES = [
  { type_code: 'SINGLE', name: 'Single' },
  { type_code: 'DOUBLE', name: 'Double' },
  { type_code: 'TRIPLE', name: 'Triple' },
  { type_code: 'QUAD', name: 'Quad' },
  { type_code: 'FAMILY', name: 'Family' },
];

const VENDOR_TYPES = [
  { type_code: 'AGENCY', name: 'Agency' },
];

const HOTEL_STATUSES = [
  { status_code: 'ACTIVE', name: 'Active' },
  { status_code: 'INACTIVE', name: 'Inactive' },
];

const GROUP_HOTEL_STAY_STATUSES = [
  { status_code: 'PLANNED', name: 'Planned' },
  { status_code: 'CONFIRMED', name: 'Confirmed' },
  { status_code: 'COMPLETED', name: 'Completed' },
  { status_code: 'CANCELLED', name: 'Cancelled' },
];

const ROOM_STATUSES = [
  { status_code: 'AVAILABLE', name: 'Available' },
  { status_code: 'UNAVAILABLE', name: 'Unavailable' },
];

const ROOM_ASSIGNMENT_STATUSES = [
  { status_code: 'ASSIGNED', name: 'Assigned' },
  { status_code: 'RELEASED', name: 'Released' },
  { status_code: 'CANCELLED', name: 'Cancelled' },
];

const VENDOR_STATUSES = [
  { status_code: 'ACTIVE', name: 'Active' },
  { status_code: 'INACTIVE', name: 'Inactive' },
];

const TRANSPORT_SEGMENT_STATUSES = [
  { status_code: 'PLANNED', name: 'Planned' },
  { status_code: 'CONFIRMED', name: 'Confirmed' },
  { status_code: 'COMPLETED', name: 'Completed' },
  { status_code: 'CANCELLED', name: 'Cancelled' },
];

async function upsertLookupTypeCodes(
  db: LogisticsDb,
  table: (typeof schema)['hotelTypes'],
  rows: { type_code: string; name: string }[],
) {
  for (const row of rows) {
    await db
      .insert(table as any)
      .values({
        id: ulid(),
        type_code: row.type_code,
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

async function upsertLookupStatusCodes(
  db: LogisticsDb,
  table:
    | (typeof schema)['hotelStatuses']
    | (typeof schema)['groupHotelStayStatuses']
    | (typeof schema)['roomStatuses']
    | (typeof schema)['roomAssignmentStatuses']
    | (typeof schema)['vendorStatuses']
    | (typeof schema)['transportSegmentStatuses'],
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
 * Seeds Slice 6 logistics lookup values.
 */
export async function seedLogistics(db: LogisticsDb) {
  await upsertLookupTypeCodes(db, schema.hotelTypes, HOTEL_TYPES);
  await upsertLookupTypeCodes(db, schema.roomTypes, ROOM_TYPES);
  await upsertLookupTypeCodes(db, schema.vendorTypes, VENDOR_TYPES);

  await upsertLookupStatusCodes(db, schema.hotelStatuses, HOTEL_STATUSES);
  await upsertLookupStatusCodes(
    db,
    schema.groupHotelStayStatuses,
    GROUP_HOTEL_STAY_STATUSES,
  );
  await upsertLookupStatusCodes(db, schema.roomStatuses, ROOM_STATUSES);
  await upsertLookupStatusCodes(
    db,
    schema.roomAssignmentStatuses,
    ROOM_ASSIGNMENT_STATUSES,
  );
  await upsertLookupStatusCodes(db, schema.vendorStatuses, VENDOR_STATUSES);
  await upsertLookupStatusCodes(
    db,
    schema.transportSegmentStatuses,
    TRANSPORT_SEGMENT_STATUSES,
  );

  console.log('Logistics lookup data seeded successfully');
}
