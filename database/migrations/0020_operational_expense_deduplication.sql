-- 0020_operational_expense_deduplication.sql
-- Ensures at most one Finance expense exists per operational source record.
-- These unique indexes on nullable source columns enforce the deduplication
-- invariant at the database level. MySQL/MariaDB allow multiple NULL values
-- in a unique index, so expenses without a source link are unaffected.
-- This complements the application-level check in ExpensesService.

CREATE UNIQUE INDEX `uq_expenses_source_visa_application`
  ON `expenses` (`source_visa_application_id`);

CREATE UNIQUE INDEX `uq_expenses_source_flight_booking`
  ON `expenses` (`source_flight_booking_id`);

CREATE UNIQUE INDEX `uq_expenses_source_group_hotel_stay`
  ON `expenses` (`source_group_hotel_stay_id`);

CREATE UNIQUE INDEX `uq_expenses_source_transport_segment`
  ON `expenses` (`source_transport_segment_id`);
