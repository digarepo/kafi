-- Round 7 — Expense Adjustments
-- Supplier refunds, cancellation fees, and other adjustments to operational
-- expenses. The original expense is NEVER modified or deleted — adjustments
-- are recorded separately and explicitly so that:
--   Original expense + Adjustments = Net actual cost
-- The source_record_* fields preserve traceability even when the originating
-- operational record (hotel stay, transport segment) is hard-deleted.

CREATE TABLE `expense_adjustments` (
	`id` char(26) NOT NULL,
	`adjustment_number` varchar(30) NOT NULL,
	`expense_id` char(26) NOT NULL,
	`adjustment_type` enum('SUPPLIER_REFUND','CANCELLATION_FEE','OTHER_ADJUSTMENT') NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`adjustment_date` datetime NOT NULL,
	`description` varchar(255),
	`reason` text NOT NULL,
	`source_record_type` enum('FLIGHT_BOOKING','GROUP_HOTEL_STAY','TRANSPORT_SEGMENT','VISA_APPLICATION','REGISTRATION') NOT NULL,
	`source_record_id` char(26) NOT NULL,
	`source_record_number` varchar(30),
	`traveller_id` char(26),
	`registration_id` char(26),
	`travel_group_id` char(26),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expense_adjustments_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_adjustments_adjustment_number_unique` UNIQUE(`adjustment_number`),
	CONSTRAINT `expense_adjustments_expense_type_unique` UNIQUE(`expense_id`,`adjustment_type`)
);
--> statement-breakpoint
CREATE INDEX `expense_adjustments_expense_id_idx` ON `expense_adjustments` (`expense_id`);
--> statement-breakpoint
CREATE INDEX `expense_adjustments_source_record_idx` ON `expense_adjustments` (`source_record_id`,`source_record_type`);
--> statement-breakpoint
CREATE INDEX `expense_adjustments_traveller_id_idx` ON `expense_adjustments` (`traveller_id`);
--> statement-breakpoint
CREATE INDEX `expense_adjustments_registration_id_idx` ON `expense_adjustments` (`registration_id`);

-- Round 7 — Finance exception concurrency: unique index on (registration_id)
-- where status is ACTIVE. MySQL does not support partial/filtered unique
-- indexes, so we add a nullable `active_lock` column that is set to the
-- exception id when ACTIVE and NULL otherwise. A unique index on
-- (registration_id, active_lock) prevents two ACTIVE exceptions for the same
-- registration because both would have a non-NULL active_lock value.
ALTER TABLE `finance_exceptions` ADD COLUMN `active_lock` char(26);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_exceptions_active_per_registration_unique`
  ON `finance_exceptions` (`registration_id`, `active_lock`);
