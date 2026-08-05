CREATE TABLE `invoice_line_item_types` (
	`id` char(26) NOT NULL,
	`line_item_type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `invoice_line_item_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_line_item_types_line_item_type_code_unique` UNIQUE(`line_item_type_code`)
);
--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
	`id` char(26) NOT NULL,
	`invoice_id` char(26) NOT NULL,
	`line_item_type_id` char(26),
	`description` varchar(255) NOT NULL,
	`quantity` decimal(18,2) NOT NULL DEFAULT '1',
	`unit_price` decimal(18,2) NOT NULL,
	`total_price` decimal(18,2) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `invoice_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_statuses` (
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
	CONSTRAINT `invoice_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoice_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` char(26) NOT NULL,
	`invoice_number` varchar(30) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`invoice_date` datetime NOT NULL,
	`due_date` datetime,
	`subtotal` decimal(18,2) NOT NULL,
	`discount_amount` decimal(18,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(18,2) NOT NULL,
	`currency_id` char(26) NOT NULL,
	`invoice_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoice_number_unique` UNIQUE(`invoice_number`)
);
--> statement-breakpoint
CREATE TABLE `payer_statuses` (
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
	CONSTRAINT `payer_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `payer_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `payer_types` (
	`id` char(26) NOT NULL,
	`type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `payer_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `payer_types_type_code_unique` UNIQUE(`type_code`)
);
--> statement-breakpoint
CREATE TABLE `payers` (
	`id` char(26) NOT NULL,
	`payer_number` varchar(30) NOT NULL,
	`payer_type_id` char(26) NOT NULL,
	`traveller_id` char(26),
	`contact_person_id` char(26),
	`organization_name` varchar(255),
	`contact_name` varchar(255),
	`phone_number` varchar(30),
	`email_address` varchar(255),
	`payer_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `payers_id` PRIMARY KEY(`id`),
	CONSTRAINT `payers_payer_number_unique` UNIQUE(`payer_number`)
);
--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` char(26) NOT NULL,
	`payment_id` char(26) NOT NULL,
	`invoice_id` char(26) NOT NULL,
	`allocated_amount` decimal(18,2) NOT NULL,
	`allocation_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `payment_allocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_allocations_payment_invoice_unique` UNIQUE(`payment_id`,`invoice_id`)
);
--> statement-breakpoint
CREATE TABLE `payment_method_statuses` (
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
	CONSTRAINT `payment_method_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_method_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` char(26) NOT NULL,
	`method_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`payment_method_status_id` char(26) NOT NULL,
	`display_order` int NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_method_code_unique` UNIQUE(`method_code`)
);
--> statement-breakpoint
CREATE TABLE `payment_statuses` (
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
	CONSTRAINT `payment_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` char(26) NOT NULL,
	`payment_number` varchar(30) NOT NULL,
	`payer_id` char(26) NOT NULL,
	`payment_method_id` char(26) NOT NULL,
	`payment_date` datetime NOT NULL,
	`original_amount` decimal(18,2) NOT NULL,
	`original_currency_id` char(26) NOT NULL,
	`exchange_rate` decimal(18,6) NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`reference_number` varchar(100),
	`received_by` char(26) NOT NULL,
	`payment_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_payment_number_unique` UNIQUE(`payment_number`)
);
--> statement-breakpoint
CREATE INDEX `invoice_line_items_invoice_id_idx` ON `invoice_line_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `invoices_registration_id_idx` ON `invoices` (`registration_id`);--> statement-breakpoint
CREATE INDEX `payment_allocations_invoice_id_idx` ON `payment_allocations` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `payment_allocations_payment_id_idx` ON `payment_allocations` (`payment_id`);--> statement-breakpoint
CREATE INDEX `payments_payer_id_idx` ON `payments` (`payer_id`);