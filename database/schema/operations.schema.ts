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
import { cities, currencies } from './common.schema.js';
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
    group_number: varchar('group_number', { length: 30 }).notNull().unique(),
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
    guarantee_required: boolean('guarantee_required').notNull().default(true),
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
    group_membership_id: fkUuid('group_membership_id'),
    registration_id: fkUuid('registration_id').notNull(),
    guarantee_type: mysqlEnum('guarantee_type', [
      'PERSON',
      'CASH_DEPOSIT',
      'CPO',
      'BANK_GUARANTEE',
      'OTHER',
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
    instrument_reference: varchar('instrument_reference', {
      length: 120,
    }).unique(),
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

/**
 * Lookup: hotel classifications.
 */
export const hotelTypes = mysqlTable('hotel_types', {
  id: idColumn,
  type_code: codeColumn('type_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: room classifications.
 */
export const roomTypes = mysqlTable('room_types', {
  id: idColumn,
  type_code: codeColumn('type_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: vendor classifications.
 */
export const vendorTypes = mysqlTable('vendor_types', {
  id: idColumn,
  type_code: codeColumn('type_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: lifecycle states for hotels.
 */
export const hotelStatuses = mysqlTable('hotel_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: lifecycle states for group hotel stays.
 */
export const groupHotelStayStatuses = mysqlTable('group_hotel_stay_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: lifecycle states for rooms.
 */
export const roomStatuses = mysqlTable('room_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: lifecycle states for room assignments.
 */
export const roomAssignmentStatuses = mysqlTable('room_assignment_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: lifecycle states for vendors.
 */
export const vendorStatuses = mysqlTable('vendor_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Lookup: lifecycle states for transport segments.
 */
export const transportSegmentStatuses = mysqlTable(
  'transport_segment_statuses',
  {
    id: idColumn,
    status_code: codeColumn('status_code'),
    name: nameColumn(),
    description: text('description'),
    is_active: boolean('is_active').notNull().default(true),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
);

/**
 * Master catalog of hotels.
 */
export const hotels = mysqlTable(
  'hotels',
  {
    id: idColumn,
    hotel_code: varchar('hotel_code', { length: 30 }).notNull().unique(),
    name: varchar('name', { length: 150 }).notNull(),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    country: varchar('country', { length: 100 }),
    phone_number: varchar('phone_number', { length: 30 }),
    email_address: varchar('email_address', { length: 255 }),
    hotel_type_id: fkUuid('hotel_type_id'),
    hotel_status_id: fkUuid('hotel_status_id').notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('hotels_hotel_status_id_idx').on(table.hotel_status_id),
    index('hotels_hotel_type_id_idx').on(table.hotel_type_id),
  ],
);

/**
 * Master catalog of partner agencies / vendors.
 */
export const vendors = mysqlTable(
  'vendors',
  {
    id: idColumn,
    vendor_number: varchar('vendor_number', { length: 30 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    vendor_type_id: fkUuid('vendor_type_id').notNull(),
    contact_person_name: varchar('contact_person_name', { length: 255 }),
    phone_number: varchar('phone_number', { length: 30 }),
    alternate_phone_number: varchar('alternate_phone_number', { length: 30 }),
    email_address: varchar('email_address', { length: 255 }),
    address: text('address'),
    tax_identification_number: varchar('tax_identification_number', {
      length: 100,
    }),
    license_number: varchar('license_number', { length: 100 }),
    vendor_status_id: fkUuid('vendor_status_id').notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('vendors_vendor_status_id_idx').on(table.vendor_status_id),
    index('vendors_vendor_type_id_idx').on(table.vendor_type_id),
  ],
);

/**
 * A hotel stay for one travel group.
 *
 * A travel group may have multiple stays (e.g. Makkah, Madinah, Jeddah).
 * `sequence_order` provides a stable chronological ordering. `hotel_id` is
 * optional for the MVP — staff may enter `hotel_name` directly without a
 * pre-existing master catalog record. `city_id` is the geographic source of
 * truth for the stay location.
 */
export const groupHotelStays = mysqlTable(
  'group_hotel_stays',
  {
    id: idColumn,
    stay_number: varchar('stay_number', { length: 30 }).notNull().unique(),
    travel_group_id: fkUuid('travel_group_id').notNull(),
    hotel_id: fkUuid('hotel_id'),
    hotel_name: varchar('hotel_name', { length: 255 }),
    booking_reference: varchar('booking_reference', { length: 120 }),
    sequence_order: int('sequence_order').notNull().default(1),
    city_id: fkUuid('city_id').notNull(),
    check_in_date: date('check_in_date').notNull(),
    check_out_date: date('check_out_date').notNull(),
    group_hotel_stay_status_id: fkUuid('group_hotel_stay_status_id').notNull(),
    // Round 6: accommodation cost for this stay (supplier cost, not customer charge)
    accommodation_cost: decimal('accommodation_cost', {
      precision: 18,
      scale: 2,
    }),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('group_hotel_stays_travel_group_sequence_unique').on(
      table.travel_group_id,
      table.sequence_order,
    ),
    index('group_hotel_stays_travel_group_id_idx').on(table.travel_group_id),
    index('group_hotel_stays_hotel_id_idx').on(table.hotel_id),
    index('group_hotel_stays_city_id_idx').on(table.city_id),
    index('group_hotel_stays_check_in_date_idx').on(table.check_in_date),
    index('group_hotel_stays_sequence_order_idx').on(table.sequence_order),
  ],
);

/**
 * A room within a group hotel stay.
 */
export const rooms = mysqlTable(
  'rooms',
  {
    id: idColumn,
    room_code: varchar('room_code', { length: 30 }),
    group_hotel_stay_id: fkUuid('group_hotel_stay_id').notNull(),
    room_number: varchar('room_number', { length: 50 }).notNull(),
    capacity: int('capacity').notNull(),
    gender_restriction: mysqlEnum('gender_restriction', ['Female', 'Male']),
    room_type_id: fkUuid('room_type_id'),
    room_status_id: fkUuid('room_status_id').notNull(),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('rooms_group_hotel_stay_room_number_unique').on(
      table.group_hotel_stay_id,
      table.room_number,
    ),
    index('rooms_group_hotel_stay_id_idx').on(table.group_hotel_stay_id),
    index('rooms_room_status_id_idx').on(table.room_status_id),
  ],
);

/**
 * A room occupancy assignment tied to a group membership.
 */
export const roomAssignments = mysqlTable(
  'room_assignments',
  {
    id: idColumn,
    room_id: fkUuid('room_id').notNull(),
    group_hotel_stay_id: fkUuid('group_hotel_stay_id').notNull(),
    group_membership_id: fkUuid('group_membership_id').notNull(),
    assigned_at: datetime('assigned_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    released_at: datetime('released_at', { mode: 'date' }),
    bed_number: varchar('bed_number', { length: 20 }),
    room_assignment_status_id: fkUuid('room_assignment_status_id').notNull(),
    is_active_assignment: boolean('is_active_assignment'),
    /**
     * Application-managed column: set to `membershipId|stayId` when the
     * assignment is active, NULL when released. The unique constraint on
     * this column enforces one active assignment per (membership, stay)
     * pair. MariaDB treats NULL as distinct in unique indexes, so released
     * (inactive) rows with NULL don't conflict.
     */
    active_membership_stay_key: varchar('active_membership_stay_key', {
      length: 79,
    }),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('room_assignments_room_id_idx').on(table.room_id),
    index('room_assignments_group_hotel_stay_id_idx').on(
      table.group_hotel_stay_id,
    ),
    index('room_assignments_group_membership_id_idx').on(
      table.group_membership_id,
    ),
    unique('room_assignments_active_unique').on(
      table.active_membership_stay_key,
    ),
  ],
);

/**
 * A ground transport segment for a travel group.
 */
export const transportSegments = mysqlTable(
  'transport_segments',
  {
    id: idColumn,
    transport_segment_number: varchar('transport_segment_number', {
      length: 30,
    })
      .notNull()
      .unique(),
    travel_group_id: fkUuid('travel_group_id').notNull(),
    vendor_id: fkUuid('vendor_id'),
    transport_type: mysqlEnum('transport_type', [
      'BUS',
      'COASTER',
      'VAN',
      'SEDAN',
      'SUV',
      'OTHER',
    ]),
    segment_order: int('segment_order').notNull(),
    origin_location: varchar('origin_location', { length: 255 }).notNull(),
    destination_location: varchar('destination_location', {
      length: 255,
    }).notNull(),
    origin_type: mysqlEnum('origin_type', [
      'AIRPORT',
      'HOTEL',
      'RELIGIOUS_SITE',
      'OTHER',
    ]),
    destination_type: mysqlEnum('destination_type', [
      'AIRPORT',
      'HOTEL',
      'RELIGIOUS_SITE',
      'OTHER',
    ]),
    departure_datetime: datetime('departure_datetime', { mode: 'date' }),
    arrival_datetime: datetime('arrival_datetime', { mode: 'date' }),
    vehicle_identifier: varchar('vehicle_identifier', { length: 100 }),
    driver_name: varchar('driver_name', { length: 255 }),
    driver_phone_number: varchar('driver_phone_number', { length: 30 }),
    transport_segment_status_id: fkUuid(
      'transport_segment_status_id',
    ).notNull(),
    // Round 6: transport cost for this segment (supplier cost, not customer charge)
    transport_cost: decimal('transport_cost', { precision: 18, scale: 2 }),
    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('transport_segments_travel_group_order_unique').on(
      table.travel_group_id,
      table.segment_order,
    ),
    index('transport_segments_travel_group_id_idx').on(table.travel_group_id),
    index('transport_segments_vendor_id_idx').on(table.vendor_id),
    index('transport_segments_departure_datetime_idx').on(
      table.departure_datetime,
    ),
  ],
);

// Relations

export const hotelTypesRelations = relations(hotelTypes, ({ many }) => ({
  hotels: many(hotels),
}));

export const roomTypesRelations = relations(roomTypes, ({ many }) => ({
  rooms: many(rooms),
}));

export const vendorTypesRelations = relations(vendorTypes, ({ many }) => ({
  vendors: many(vendors),
}));

export const hotelStatusesRelations = relations(hotelStatuses, ({ many }) => ({
  hotels: many(hotels),
}));

export const groupHotelStayStatusesRelations = relations(
  groupHotelStayStatuses,
  ({ many }) => ({
    groupHotelStays: many(groupHotelStays),
  }),
);

export const roomStatusesRelations = relations(roomStatuses, ({ many }) => ({
  rooms: many(rooms),
}));

export const roomAssignmentStatusesRelations = relations(
  roomAssignmentStatuses,
  ({ many }) => ({
    roomAssignments: many(roomAssignments),
  }),
);

export const vendorStatusesRelations = relations(
  vendorStatuses,
  ({ many }) => ({
    vendors: many(vendors),
  }),
);

export const transportSegmentStatusesRelations = relations(
  transportSegmentStatuses,
  ({ many }) => ({
    transportSegments: many(transportSegments),
  }),
);

export const hotelsRelations = relations(hotels, ({ one }) => ({
  hotelType: one(hotelTypes, {
    fields: [hotels.hotel_type_id],
    references: [hotelTypes.id],
  }),
  hotelStatus: one(hotelStatuses, {
    fields: [hotels.hotel_status_id],
    references: [hotelStatuses.id],
  }),
  createdBy: one(users, {
    fields: [hotels.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [hotels.updated_by],
    references: [users.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one }) => ({
  vendorType: one(vendorTypes, {
    fields: [vendors.vendor_type_id],
    references: [vendorTypes.id],
  }),
  vendorStatus: one(vendorStatuses, {
    fields: [vendors.vendor_status_id],
    references: [vendorStatuses.id],
  }),
  createdBy: one(users, {
    fields: [vendors.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [vendors.updated_by],
    references: [users.id],
  }),
}));

export const groupHotelStaysRelations = relations(
  groupHotelStays,
  ({ one, many }) => ({
    travelGroup: one(travelGroups, {
      fields: [groupHotelStays.travel_group_id],
      references: [travelGroups.id],
    }),
    hotel: one(hotels, {
      fields: [groupHotelStays.hotel_id],
      references: [hotels.id],
    }),
    city: one(cities, {
      fields: [groupHotelStays.city_id],
      references: [cities.id],
    }),
    status: one(groupHotelStayStatuses, {
      fields: [groupHotelStays.group_hotel_stay_status_id],
      references: [groupHotelStayStatuses.id],
    }),
    rooms: many(rooms),
    roomAssignments: many(roomAssignments),
    createdBy: one(users, {
      fields: [groupHotelStays.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [groupHotelStays.updated_by],
      references: [users.id],
    }),
  }),
);

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  groupHotelStay: one(groupHotelStays, {
    fields: [rooms.group_hotel_stay_id],
    references: [groupHotelStays.id],
  }),
  roomType: one(roomTypes, {
    fields: [rooms.room_type_id],
    references: [roomTypes.id],
  }),
  roomStatus: one(roomStatuses, {
    fields: [rooms.room_status_id],
    references: [roomStatuses.id],
  }),
  roomAssignments: many(roomAssignments),
  createdBy: one(users, {
    fields: [rooms.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [rooms.updated_by],
    references: [users.id],
  }),
}));

export const roomAssignmentsRelations = relations(
  roomAssignments,
  ({ one }) => ({
    room: one(rooms, {
      fields: [roomAssignments.room_id],
      references: [rooms.id],
    }),
    groupHotelStay: one(groupHotelStays, {
      fields: [roomAssignments.group_hotel_stay_id],
      references: [groupHotelStays.id],
    }),
    groupMembership: one(groupMemberships, {
      fields: [roomAssignments.group_membership_id],
      references: [groupMemberships.id],
    }),
    status: one(roomAssignmentStatuses, {
      fields: [roomAssignments.room_assignment_status_id],
      references: [roomAssignmentStatuses.id],
    }),
    createdBy: one(users, {
      fields: [roomAssignments.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [roomAssignments.updated_by],
      references: [users.id],
    }),
  }),
);

export const transportSegmentsRelations = relations(
  transportSegments,
  ({ one }) => ({
    travelGroup: one(travelGroups, {
      fields: [transportSegments.travel_group_id],
      references: [travelGroups.id],
    }),
    vendor: one(vendors, {
      fields: [transportSegments.vendor_id],
      references: [vendors.id],
    }),
    status: one(transportSegmentStatuses, {
      fields: [transportSegments.transport_segment_status_id],
      references: [transportSegmentStatuses.id],
    }),
    createdBy: one(users, {
      fields: [transportSegments.created_by],
      references: [users.id],
    }),
    updatedBy: one(users, {
      fields: [transportSegments.updated_by],
      references: [users.id],
    }),
  }),
);
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
    hotelStays: many(groupHotelStays),
    transportSegments: many(transportSegments),
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
    roomAssignments: many(roomAssignments),
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
