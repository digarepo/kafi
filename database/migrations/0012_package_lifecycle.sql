CREATE TABLE `package_template_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `package_template_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_template_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
INSERT INTO `package_template_statuses` (`id`, `status_code`, `name`, `is_active`, `created_at`, `updated_at`)
SELECT LEFT(REPLACE(UUID(), '-', ''), 26), 'ACTIVE', 'Active', TRUE, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `package_template_statuses` WHERE `status_code` = 'ACTIVE');
--> statement-breakpoint
INSERT INTO `package_template_statuses` (`id`, `status_code`, `name`, `is_active`, `created_at`, `updated_at`)
SELECT LEFT(REPLACE(UUID(), '-', ''), 26), 'ARCHIVED', 'Archived', TRUE, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `package_template_statuses` WHERE `status_code` = 'ARCHIVED');
--> statement-breakpoint
ALTER TABLE `package_templates` ADD COLUMN `package_template_status_id` char(26) NULL AFTER `default_duration_days`;
--> statement-breakpoint
UPDATE `package_templates`
SET `package_template_status_id` = (
  SELECT `id` FROM `package_template_statuses` WHERE `status_code` = 'ACTIVE' LIMIT 1
)
WHERE `package_template_status_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `package_templates` MODIFY COLUMN `package_template_status_id` char(26) NOT NULL;
