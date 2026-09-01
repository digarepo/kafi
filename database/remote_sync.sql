-- ============================================================
-- Kafi — Consolidated Remote Migration (0022 through 0030)
-- ============================================================
-- This file is IDEMPOTENT — safe to run multiple times.
-- It covers all migrations from 0022 to 0030 that may not have
-- been applied to the remote database yet.
--
-- Run with:
--   mysql -h <remote_host> -u <remote_user> -p <remote_db> < database/remote_sync.sql
-- ============================================================

-- ============================================================
-- 0022: Public Inquiries
-- ============================================================
CREATE TABLE IF NOT EXISTS `inquiries` (
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

-- ============================================================
-- 0023: Inquiry first_viewed_at
-- ============================================================
-- Use prepared-style guard: only add if column doesn't exist.
-- MySQL doesn't support ADD COLUMN IF NOT EXISTS natively, so we
-- use a procedure that checks information_schema first.
DELIMITER $$
DROP PROCEDURE IF EXISTS `_add_column_if_missing`$$
CREATE PROCEDURE `_add_column_if_missing`(
  IN p_table VARCHAR(100),
  IN p_column VARCHAR(100),
  IN p_definition VARCHAR(500)
)
BEGIN
  DECLARE col_count INT;
  SELECT COUNT(*) INTO col_count
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND BINARY TABLE_NAME = BINARY p_table
    AND BINARY COLUMN_NAME = BINARY p_column;
  IF col_count = 0 THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL `_add_column_if_missing`('inquiries', 'first_viewed_at', 'DATETIME NULL AFTER `resolved_at`');

-- ============================================================
-- 0024: Remove LOCKED user status
-- ============================================================
-- Move any LOCKED users to SUSPENDED, then delete LOCKED status.
UPDATE `users`
SET `user_status_id` = (
  SELECT `id` FROM `user_statuses` WHERE `status_code` = 'SUSPENDED' LIMIT 1
)
WHERE `user_status_id` = (
  SELECT `id` FROM `user_statuses` WHERE `status_code` = 'LOCKED' LIMIT 1
);
DELETE FROM `user_statuses` WHERE `status_code` = 'LOCKED';

-- ============================================================
-- 0025: Credit Exception Requests
-- ============================================================
CREATE TABLE IF NOT EXISTS `credit_exception_request_statuses` (
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
	CONSTRAINT `credit_exception_request_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_exception_request_statuses_status_code_unique` UNIQUE(`status_code`)
);

CREATE TABLE IF NOT EXISTS `credit_exception_requests` (
	`id` char(26) NOT NULL,
	`request_number` varchar(30) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`requested_amount` decimal(18, 2) NOT NULL,
	`reason` text NOT NULL,
	`requested_due_date` datetime,
	`requested_by` char(26) NOT NULL,
	`credit_exception_request_status_id` char(26) NOT NULL,
	`active_request_lock` char(26),
	`reviewed_by` char(26),
	`reviewed_at` datetime,
	`rejection_reason` text,
	`finance_exception_id` char(26),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	`created_by` char(26),
	`updated_by` char(26),
	CONSTRAINT `credit_exception_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_exception_requests_request_number_unique` UNIQUE(`request_number`)
);

-- Indexes for 0025 (use IF NOT EXISTS where supported, otherwise ignore errors)
-- MySQL 8.0+ / MariaDB 10.5+ supports IF NOT EXISTS on indexes.
CREATE INDEX IF NOT EXISTS `credit_exception_requests_registration_id_idx`
  ON `credit_exception_requests` (`registration_id`);
CREATE INDEX IF NOT EXISTS `credit_exception_requests_status_id_idx`
  ON `credit_exception_requests` (`credit_exception_request_status_id`);
CREATE INDEX IF NOT EXISTS `credit_exception_requests_requested_by_idx`
  ON `credit_exception_requests` (`requested_by`);
CREATE UNIQUE INDEX IF NOT EXISTS `credit_exception_requests_active_per_registration_unique`
  ON `credit_exception_requests` (`registration_id`, `active_request_lock`);

-- ============================================================
-- 0026: Analytics Events
-- ============================================================
CREATE TABLE IF NOT EXISTS `analytics_events` (
	`id` char(26) NOT NULL,
	`event_name` varchar(50) NOT NULL,
	`event_type` enum('custom','conversion') NOT NULL DEFAULT 'custom',
	`anonymous_visitor_id` varchar(36),
	`page_path` varchar(500),
	`referrer` varchar(500),
	`utm_source` varchar(150),
	`utm_medium` varchar(150),
	`utm_campaign` varchar(150),
	`utm_content` varchar(150),
	`utm_term` varchar(150),
	`payload` json,
	`inquiry_id` varchar(26),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);

CREATE INDEX IF NOT EXISTS `analytics_events_name_type_created_idx`
  ON `analytics_events` (`event_name`, `event_type`, `created_at`);
CREATE INDEX IF NOT EXISTS `analytics_events_visitor_id_idx`
  ON `analytics_events` (`anonymous_visitor_id`);
CREATE INDEX IF NOT EXISTS `analytics_events_inquiry_id_idx`
  ON `analytics_events` (`inquiry_id`);
CREATE INDEX IF NOT EXISTS `analytics_events_utm_source_created_idx`
  ON `analytics_events` (`utm_source`, `created_at`);

-- ============================================================
-- 0027: Inquiry Attribution (UTM columns on inquiries)
-- ============================================================
CALL `_add_column_if_missing`('inquiries', 'utm_source', 'varchar(150)');
CALL `_add_column_if_missing`('inquiries', 'utm_medium', 'varchar(150)');
CALL `_add_column_if_missing`('inquiries', 'utm_campaign', 'varchar(150)');
CALL `_add_column_if_missing`('inquiries', 'utm_content', 'varchar(150)');
CALL `_add_column_if_missing`('inquiries', 'utm_term', 'varchar(150)');
CALL `_add_column_if_missing`('inquiries', 'anonymous_visitor_id', 'varchar(36)');

-- ============================================================
-- 0028: Inquiry Permissions
-- ============================================================
INSERT IGNORE INTO `permissions` (`id`, `permission_code`, `name`, `module`, `created_at`, `updated_at`, `is_deleted`) VALUES
  ('01J6Q00000000000000000000V', 'INQUIRY_VIEW', 'View inquiries', 'Inquiries', NOW(), NOW(), false),
  ('01J6Q00000000000000000000W', 'INQUIRY_MANAGE', 'Manage inquiries', 'Inquiries', NOW(), NOW(), false);

INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000010', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'ADMIN' AND p.permission_code = 'INQUIRY_VIEW';

INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000011', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'ADMIN' AND p.permission_code = 'INQUIRY_MANAGE';

INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000012', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'MANAGER' AND p.permission_code = 'INQUIRY_VIEW';

INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000013', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'MANAGER' AND p.permission_code = 'INQUIRY_MANAGE';

INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000014', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'AGENT' AND p.permission_code = 'INQUIRY_VIEW';

INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000015', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'AGENT' AND p.permission_code = 'INQUIRY_MANAGE';

-- ============================================================
-- 0029: Package Categories (replace STANDARD/VIP with COMFORT)
-- ============================================================
INSERT IGNORE INTO `package_categories` (`id`, `category_code`, `name`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
VALUES ('01J6Q0000000000000000000C1', 'COMFORT', 'Comfort', true, NOW(), NOW(), false);

UPDATE `package_templates`
SET `package_category_id` = (
  SELECT `id` FROM `package_categories` WHERE `category_code` = 'COMFORT' LIMIT 1
)
WHERE `package_category_id` IN (
  SELECT `id` FROM (
    SELECT `id` FROM `package_categories` WHERE `category_code` IN ('STANDARD', 'VIP')
  ) AS `old_cat_ids`
);

DELETE FROM `package_categories` WHERE `category_code` IN ('STANDARD', 'VIP');

-- ============================================================
-- 0030: User Name Columns (first_name, middle_name, last_name)
-- ============================================================
CALL `_add_column_if_missing`('users', 'first_name', 'varchar(100) NULL AFTER `full_name`');
CALL `_add_column_if_missing`('users', 'middle_name', 'varchar(100) NULL AFTER `first_name`');
CALL `_add_column_if_missing`('users', 'last_name', 'varchar(100) NULL AFTER `middle_name`');

-- Backfill first_name and middle_name from full_name.
-- Split on first space: first_name = first token, middle_name = rest.
UPDATE `users`
SET `first_name` = SUBSTRING_INDEX(`full_name`, ' ', 1),
    `middle_name` = TRIM(SUBSTRING(`full_name`, LENGTH(SUBSTRING_INDEX(`full_name`, ' ', 1)) + 2))
WHERE `first_name` IS NULL AND `full_name` IS NOT NULL;

-- Set first_name to full_name if no space was found.
UPDATE `users` SET `first_name` = `full_name`
WHERE `first_name` IS NULL OR `first_name` = '';

-- Make first_name NOT NULL after backfill (only if column exists and is nullable).
SET @col_count = 0;
SELECT COUNT(*) INTO @col_count
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND BINARY TABLE_NAME = BINARY 'users'
  AND BINARY COLUMN_NAME = BINARY 'first_name'
  AND IS_NULLABLE = 'YES';
SET @sql = IF(@col_count > 0,
  'ALTER TABLE `users` MODIFY COLUMN `first_name` varchar(100) NOT NULL',
  'SELECT "first_name already NOT NULL" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Cleanup: Deactivate unused user statuses (INACTIVE, SUSPENDED
-- are kept; LOCKED was already deleted in 0024).
-- Per the seed, only ACTIVE, SUSPENDED, and DELETED should be active.
-- ============================================================
UPDATE `user_statuses` SET `is_active` = false
WHERE `status_code` IN ('INACTIVE', 'LOCKED')
  AND `status_code` NOT IN ('ACTIVE', 'SUSPENDED', 'DELETED');

-- ============================================================
-- Cleanup: Drop the temporary procedure
-- ============================================================
DROP PROCEDURE IF EXISTS `_add_column_if_missing`;

-- ============================================================
-- Done.
-- ============================================================
SELECT 'Remote sync complete.' AS status;
