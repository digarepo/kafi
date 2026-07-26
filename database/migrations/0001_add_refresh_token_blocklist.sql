CREATE TABLE `refresh_token_blocklist` (
	`id` char(26) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`user_id` char(26) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `refresh_token_blocklist_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_token_blocklist_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `refresh_token_blocklist_expires_at_idx` ON `refresh_token_blocklist` (`expires_at`);