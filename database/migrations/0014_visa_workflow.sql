-- Visa workflow: add result fields, remove is_approved column and trigger mechanism.
ALTER TABLE `visa_applications` ADD COLUMN `rejection_date` date;--> statement-breakpoint
ALTER TABLE `visa_applications` ADD COLUMN `rejection_reason` text;--> statement-breakpoint
ALTER TABLE `visa_applications` ADD COLUMN `cancellation_date` date;--> statement-breakpoint
ALTER TABLE `visa_applications` ADD COLUMN `cancellation_reason` text;--> statement-breakpoint
DROP INDEX `visa_applications_approved_unique` ON `visa_applications`;--> statement-breakpoint
ALTER TABLE `visa_applications` DROP COLUMN `is_approved`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `visa_applications_set_approved_before_insert`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `visa_applications_set_approved_before_update`;
