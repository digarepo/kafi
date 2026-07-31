CREATE TABLE `email_verification_tokens` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `email_verification_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`used_at` datetime,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `email_verification_tokens_user_id_idx` ON `email_verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_expires_at_idx` ON `email_verification_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_id_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expires_at_idx` ON `password_reset_tokens` (`expires_at`);