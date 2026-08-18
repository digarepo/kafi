import { relations } from 'drizzle-orm';
import {
  date,
  decimal,
  index,
  int,
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
import { registrations, travellers } from './travellers.schema.js';
import { users } from './iam.schema.js';

/**
 * Flight booking lifecycle statuses.
 *
 * Only two states: creation is always CONFIRMED, and a confirmed booking
 * can be cancelled. There is no PENDING state.
 */
export const flightBookingStatuses = mysqlTable('flight_booking_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  description: text('description'),
  display_order: int('display_order').notNull().default(1),
  is_active: int('is_active').notNull().default(1),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * A purchased flight ticket for a single registration.
 *
 * @remarks
 * - Creation sets the booking directly to CONFIRMED (no PENDING state).
 * - One active (non-deleted, non-cancelled) booking per registration for MVP.
 * - Outbound flight fields are required; return flight fields are optional.
 * - Finance expense integration is out of scope for this round.
 */
export const flightBookings = mysqlTable(
  'flight_bookings',
  {
    id: idColumn,
    booking_number: varchar('booking_number', { length: 30 })
      .notNull()
      .unique(),
    registration_id: fkUuid('registration_id').notNull(),
    flight_booking_status_id: fkUuid('flight_booking_status_id').notNull(),

    // PNR / booking reference
    pnr: varchar('pnr', { length: 50 }).notNull(),

    // Outbound flight
    departure_flight_number: varchar('departure_flight_number', {
      length: 50,
    }).notNull(),
    departure_date: date('departure_date').notNull(),

    // Return flight
    return_flight_number: varchar('return_flight_number', { length: 50 }),
    return_date: date('return_date'),

    // Cancellation
    cancellation_date: date('cancellation_date'),
    cancellation_reason: text('cancellation_reason'),

    // Round 6: supplier/ticket cost (not customer charge)
    supplier_cost: decimal('supplier_cost', { precision: 18, scale: 2 }),
    cancellation_fee: decimal('cancellation_fee', { precision: 18, scale: 2 }),

    notes: text('notes'),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    index('flight_bookings_registration_id_idx').on(table.registration_id),
    index('flight_bookings_status_id_idx').on(table.flight_booking_status_id),
  ],
);

// Relations

export const flightBookingStatusesRelations = relations(
  flightBookingStatuses,
  ({ many }) => ({
    flightBookings: many(flightBookings),
  }),
);

export const flightBookingsRelations = relations(flightBookings, ({ one }) => ({
  registration: one(registrations, {
    fields: [flightBookings.registration_id],
    references: [registrations.id],
  }),
  status: one(flightBookingStatuses, {
    fields: [flightBookings.flight_booking_status_id],
    references: [flightBookingStatuses.id],
  }),
  createdBy: one(users, {
    fields: [flightBookings.created_by],
    references: [users.id],
  }),
  updatedBy: one(users, {
    fields: [flightBookings.updated_by],
    references: [users.id],
  }),
}));
