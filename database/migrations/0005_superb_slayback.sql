CREATE TABLE `countries` (
	`id` char(26) NOT NULL,
	`iso_code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `countries_id` PRIMARY KEY(`id`),
	CONSTRAINT `countries_iso_code_unique` UNIQUE(`iso_code`)
);
--> statement-breakpoint
CREATE TABLE `languages` (
	`id` char(26) NOT NULL,
	`language_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `languages_id` PRIMARY KEY(`id`),
	CONSTRAINT `languages_language_code_unique` UNIQUE(`language_code`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` char(26) NOT NULL,
	`country_id` char(26) NOT NULL,
	`region_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_region_code_unique` UNIQUE(`region_code`)
);
--> statement-breakpoint
CREATE TABLE `contact_person_statuses` (
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
	CONSTRAINT `contact_person_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_person_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `contact_persons` (
	`id` char(26) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`last_name` varchar(100) NOT NULL,
	`gender` enum('Female','Male'),
	`date_of_birth` date,
	`phone_number` varchar(30) NOT NULL,
	`alternate_phone_number` varchar(30),
	`email_address` varchar(255),
	`address` text,
	`country_id` char(26),
	`region_id` char(26),
	`preferred_language_id` char(26),
	`contact_person_status_id` char(26) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `contact_persons_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_persons_phone_number_unique` UNIQUE(`phone_number`)
);
--> statement-breakpoint
CREATE TABLE `registration_statuses` (
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
	CONSTRAINT `registration_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `registration_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` char(26) NOT NULL,
	`registration_number` varchar(30) NOT NULL,
	`traveller_id` char(26) NOT NULL,
	`package_version_id` char(26) NOT NULL,
	`registration_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expected_departure_date` date,
	`expected_return_date` date,
	`registration_status_id` char(26) NOT NULL,
	`remarks` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_registration_number_unique` UNIQUE(`registration_number`)
);
--> statement-breakpoint
CREATE TABLE `relationship_types` (
	`id` char(26) NOT NULL,
	`relationship_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `relationship_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `relationship_types_relationship_code_unique` UNIQUE(`relationship_code`)
);
--> statement-breakpoint
CREATE TABLE `traveller_contact_statuses` (
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
	CONSTRAINT `traveller_contact_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `traveller_contact_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `traveller_contacts` (
	`id` char(26) NOT NULL,
	`traveller_id` char(26) NOT NULL,
	`contact_person_id` char(26) NOT NULL,
	`relationship_type_id` char(26) NOT NULL,
	`is_emergency_contact` boolean NOT NULL DEFAULT false,
	`is_primary_contact` boolean NOT NULL DEFAULT false,
	`priority` int NOT NULL DEFAULT 1,
	`notes` text,
	`traveller_contact_status_id` char(26) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `traveller_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `traveller_contacts_traveller_contact_priority_unique` UNIQUE(`traveller_id`,`contact_person_id`,`priority`),
	CONSTRAINT `traveller_contacts_traveller_priority_unique` UNIQUE(`traveller_id`,`priority`)
);
--> statement-breakpoint
CREATE TABLE `traveller_sources` (
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
	CONSTRAINT `traveller_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `traveller_sources_source_code_unique` UNIQUE(`source_code`)
);
--> statement-breakpoint
CREATE TABLE `traveller_statuses` (
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
	CONSTRAINT `traveller_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `traveller_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `travellers` (
	`id` char(26) NOT NULL,
	`traveller_number` varchar(30) NOT NULL,
	`first_name` varchar(100) NOT NULL,
	`middle_name` varchar(100),
	`last_name` varchar(100) NOT NULL,
	`gender` enum('Female','Male') NOT NULL,
	`date_of_birth` date,
	`phone_number` varchar(30) NOT NULL,
	`email_address` varchar(255),
	`passport_number` varchar(50),
	`fayda_number` varchar(50),
	`country_id` char(26) NOT NULL,
	`region_id` char(26),
	`preferred_language_id` char(26),
	`traveller_source_id` char(26),
	`traveller_status_id` char(26) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `travellers_id` PRIMARY KEY(`id`),
	CONSTRAINT `travellers_traveller_number_unique` UNIQUE(`traveller_number`),
	CONSTRAINT `travellers_passport_number_unique` UNIQUE(`passport_number`),
	CONSTRAINT `travellers_fayda_number_unique` UNIQUE(`fayda_number`)
);
