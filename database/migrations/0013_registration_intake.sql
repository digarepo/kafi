ALTER TABLE `documents` ADD COLUMN `display_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `guarantees` MODIFY COLUMN `group_membership_id` char(26) NULL;
--> statement-breakpoint
ALTER TABLE `guarantees` MODIFY COLUMN `guarantee_type` enum('PERSON','CASH_DEPOSIT','CPO','BANK_GUARANTEE','OTHER') NOT NULL;
