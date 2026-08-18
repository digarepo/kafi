-- Round 6 — Finance Integration
-- Expenses, Finance Exceptions, Refunds, Expense Allocations, and operational cost fields.

-- Operational cost fields
ALTER TABLE `visa_applications` ADD COLUMN `visa_cost` decimal(18,2);
--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD COLUMN `supplier_cost` decimal(18,2);
--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD COLUMN `cancellation_fee` decimal(18,2);
--> statement-breakpoint
ALTER TABLE `group_hotel_stays` ADD COLUMN `accommodation_cost` decimal(18,2);
--> statement-breakpoint
ALTER TABLE `transport_segments` ADD COLUMN `transport_cost` decimal(18,2);
--> statement-breakpoint

-- Expense statuses
CREATE TABLE `expense_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expense_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint

-- Expense categories
CREATE TABLE `expense_categories` (
	`id` char(26) NOT NULL,
	`category_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expense_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_categories_category_code_unique` UNIQUE(`category_code`)
);
--> statement-breakpoint

-- Expense sources
CREATE TABLE `expense_sources` (
	`id` char(26) NOT NULL,
	`source_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expense_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_sources_source_code_unique` UNIQUE(`source_code`)
);
--> statement-breakpoint

-- Expenses
CREATE TABLE `expenses` (
	`id` char(26) NOT NULL,
	`expense_number` varchar(30) NOT NULL,
	`expense_category_id` char(26) NOT NULL,
	`expense_source_id` char(26) NOT NULL,
	`expense_status_id` char(26) NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`original_amount` decimal(18,2),
	`original_currency_id` char(26),
	`exchange_rate` decimal(18,6),
	`expense_date` datetime NOT NULL,
	`description` varchar(255),
	`notes` text,
	`vendor_id` char(26),
	`payee_name` varchar(255),
	`attribution_scope` enum('TRAVELER','GROUP','GENERAL') NOT NULL,
	`traveller_id` char(26),
	`registration_id` char(26),
	`travel_group_id` char(26),
	`package_version_id` char(26),
	`source_visa_application_id` char(26),
	`source_flight_booking_id` char(26),
	`source_group_hotel_stay_id` char(26),
	`source_transport_segment_id` char(26),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `expenses_expense_number_unique` UNIQUE(`expense_number`)
);
--> statement-breakpoint
CREATE INDEX `expenses_category_id_idx` ON `expenses` (`expense_category_id`);
--> statement-breakpoint
CREATE INDEX `expenses_source_id_idx` ON `expenses` (`expense_source_id`);
--> statement-breakpoint
CREATE INDEX `expenses_status_id_idx` ON `expenses` (`expense_status_id`);
--> statement-breakpoint
CREATE INDEX `expenses_traveller_id_idx` ON `expenses` (`traveller_id`);
--> statement-breakpoint
CREATE INDEX `expenses_registration_id_idx` ON `expenses` (`registration_id`);
--> statement-breakpoint
CREATE INDEX `expenses_travel_group_id_idx` ON `expenses` (`travel_group_id`);
--> statement-breakpoint
CREATE INDEX `expenses_package_version_id_idx` ON `expenses` (`package_version_id`);
--> statement-breakpoint
CREATE INDEX `expenses_expense_date_idx` ON `expenses` (`expense_date`);
--> statement-breakpoint

-- Expense allocations (group expense → traveler allocation for reporting)
CREATE TABLE `expense_allocations` (
	`id` char(26) NOT NULL,
	`expense_id` char(26) NOT NULL,
	`traveller_id` char(26) NOT NULL,
	`registration_id` char(26),
	`allocated_amount` decimal(18,2) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `expense_allocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_allocations_expense_traveller_unique` UNIQUE(`expense_id`,`traveller_id`)
);
--> statement-breakpoint
CREATE INDEX `expense_allocations_expense_id_idx` ON `expense_allocations` (`expense_id`);
--> statement-breakpoint
CREATE INDEX `expense_allocations_traveller_id_idx` ON `expense_allocations` (`traveller_id`);
--> statement-breakpoint
CREATE INDEX `expense_allocations_registration_id_idx` ON `expense_allocations` (`registration_id`);
--> statement-breakpoint

-- Finance exception statuses
CREATE TABLE `finance_exception_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `finance_exception_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_exception_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint

-- Finance exceptions (authorized credit)
CREATE TABLE `finance_exceptions` (
	`id` char(26) NOT NULL,
	`exception_number` varchar(30) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`authorized_amount` decimal(18,2) NOT NULL,
	`reason` text NOT NULL,
	`approved_by` char(26) NOT NULL,
	`approved_at` datetime NOT NULL,
	`due_date` datetime,
	`finance_exception_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `finance_exceptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_exceptions_exception_number_unique` UNIQUE(`exception_number`)
);
--> statement-breakpoint
CREATE INDEX `finance_exceptions_registration_id_idx` ON `finance_exceptions` (`registration_id`);
--> statement-breakpoint
CREATE INDEX `finance_exceptions_status_id_idx` ON `finance_exceptions` (`finance_exception_status_id`);
--> statement-breakpoint

-- Refund statuses
CREATE TABLE `refund_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `refund_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `refund_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint

-- Refunds / financial adjustments
CREATE TABLE `refunds` (
	`id` char(26) NOT NULL,
	`refund_number` varchar(30) NOT NULL,
	`payment_id` char(26) NOT NULL,
	`payer_id` char(26) NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`reason` text NOT NULL,
	`refund_date` datetime NOT NULL,
	`approved_by` char(26) NOT NULL,
	`approved_at` datetime NOT NULL,
	`refund_status_id` char(26) NOT NULL,
	`registration_id` char(26),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `refunds_refund_number_unique` UNIQUE(`refund_number`)
);
--> statement-breakpoint
CREATE INDEX `refunds_payment_id_idx` ON `refunds` (`payment_id`);
--> statement-breakpoint
CREATE INDEX `refunds_payer_id_idx` ON `refunds` (`payer_id`);
--> statement-breakpoint
CREATE INDEX `refunds_status_id_idx` ON `refunds` (`refund_status_id`);
--> statement-breakpoint
CREATE INDEX `refunds_registration_id_idx` ON `refunds` (`registration_id`);
