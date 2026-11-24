ALTER TABLE `invoices` ADD `discount_type` varchar(20) DEFAULT 'FIXED' NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `discount_value` decimal(18,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
UPDATE `invoices`
SET `discount_value` = `discount_amount`
WHERE `discount_type` = 'FIXED';
