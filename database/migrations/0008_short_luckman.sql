CREATE TABLE `group_membership_statuses` (
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
	CONSTRAINT `group_membership_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_membership_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `group_memberships` (
	`id` char(26) NOT NULL,
	`travel_group_id` char(26) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`group_membership_status_id` char(26) NOT NULL,
	`joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`left_at` datetime,
	`transferred_from_group_membership_id` char(26),
	`guarantee_required` boolean NOT NULL DEFAULT true,
	`guarantee_waived` boolean NOT NULL DEFAULT false,
	`guarantee_waived_by` char(26),
	`guarantee_waived_at` datetime,
	`remarks` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `group_memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guarantees` (
	`id` char(26) NOT NULL,
	`guarantee_number` varchar(30) NOT NULL,
	`group_membership_id` char(26) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`guarantee_type` enum('PERSON','CASH_DEPOSIT','CPO','BANK_GUARANTEE') NOT NULL,
	`guarantee_status` enum('PENDING','ACTIVE','REPLACED','RELEASED','REFUNDED','EXPIRED') NOT NULL DEFAULT 'PENDING',
	`contact_person_id` char(26),
	`instrument_reference` varchar(120),
	`amount` decimal(18,2),
	`currency_id` char(26),
	`effective_date` date,
	`expiry_date` date,
	`issuer` varchar(120),
	`previous_guarantee_id` char(26),
	`replaced_by_id` char(26),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `guarantees_id` PRIMARY KEY(`id`),
	CONSTRAINT `guarantees_guarantee_number_unique` UNIQUE(`guarantee_number`),
	CONSTRAINT `guarantees_instrument_reference_unique` UNIQUE(`instrument_reference`)
);
--> statement-breakpoint
CREATE TABLE `travel_group_statuses` (
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
	CONSTRAINT `travel_group_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `travel_group_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `travel_groups` (
	`id` char(26) NOT NULL,
	`group_number` varchar(30) NOT NULL,
	`package_version_id` char(26) NOT NULL,
	`name` varchar(150) NOT NULL,
	`departure_date` date,
	`return_date` date,
	`maximum_capacity` int NOT NULL,
	`travel_group_status_id` char(26) NOT NULL,
	`remarks` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `travel_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `travel_groups_group_number_unique` UNIQUE(`group_number`)
);
--> statement-breakpoint
CREATE INDEX `group_memberships_travel_group_id_idx` ON `group_memberships` (`travel_group_id`);--> statement-breakpoint
CREATE INDEX `group_memberships_registration_id_idx` ON `group_memberships` (`registration_id`);--> statement-breakpoint
CREATE INDEX `group_memberships_status_id_idx` ON `group_memberships` (`group_membership_status_id`);--> statement-breakpoint
CREATE INDEX `guarantees_group_membership_id_idx` ON `guarantees` (`group_membership_id`);--> statement-breakpoint
CREATE INDEX `guarantees_registration_id_idx` ON `guarantees` (`registration_id`);--> statement-breakpoint
CREATE INDEX `guarantees_status_idx` ON `guarantees` (`guarantee_status`);--> statement-breakpoint
CREATE INDEX `travel_groups_package_version_id_idx` ON `travel_groups` (`package_version_id`);--> statement-breakpoint
CREATE INDEX `travel_groups_status_id_idx` ON `travel_groups` (`travel_group_status_id`);--> statement-breakpoint
CREATE INDEX `travel_groups_departure_date_idx` ON `travel_groups` (`departure_date`);