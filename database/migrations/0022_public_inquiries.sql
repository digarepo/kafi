-- Public Inquiries — inbound leads from the public website
-- A single table backs all four public form types (booking, callback, contact,
-- enquiry) so the admin inbox has one list query, one status lifecycle, and one
-- detail view. Per-type validation lives in the DTO layer.
--
-- Notes:
--   - phone_number is the only guaranteed contact field (the callback form
--     collects nothing else).
--   - package/service/travel interests are free text, NOT foreign keys: the
--     public storefront's static package slugs do not match published package
--     version slugs, so a FK would be null or wrong in practice.
--   - created_by is NULL for public submissions (actor columns are nullable).
--   - inquiry_status is an enum, following the guarantees.guarantee_status
--     precedent, because the three inbox states are fixed.

CREATE TABLE `inquiries` (
	`id` char(26) NOT NULL,
	`inquiry_number` varchar(30) NOT NULL,
	`inquiry_type` enum('BOOKING','CALLBACK','CONTACT','ENQUIRY') NOT NULL,
	`inquiry_status` enum('NEW','CONTACTED','RESOLVED') NOT NULL DEFAULT 'NEW',
	`full_name` varchar(150),
	`phone_number` varchar(30) NOT NULL,
	`email_address` varchar(255),
	`message` text,
	`enquiry_category` varchar(50),
	`package_interest` varchar(150),
	`service_interest` varchar(150),
	`travel_period` varchar(50),
	`group_size` varchar(20),
	`source_channel` varchar(50),
	`user_agent` varchar(255),
	`staff_notes` text,
	`handled_by` char(26),
	`contacted_at` datetime,
	`resolved_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`),
	CONSTRAINT `inquiries_inquiry_number_unique` UNIQUE(`inquiry_number`)
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`inquiry_status`);
--> statement-breakpoint
CREATE INDEX `inquiries_type_idx` ON `inquiries` (`inquiry_type`);
--> statement-breakpoint
CREATE INDEX `inquiries_created_at_idx` ON `inquiries` (`created_at`);
--> statement-breakpoint
CREATE INDEX `inquiries_phone_number_idx` ON `inquiries` (`phone_number`);
