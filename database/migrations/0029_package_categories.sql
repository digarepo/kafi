-- Package categories — replace STANDARD and VIP with COMFORT.
-- The business now offers three tiers: Economy, Comfort, Premium.
-- Existing templates referencing STANDARD or VIP are reassigned to COMFORT,
-- then the STANDARD and VIP rows are deleted entirely.
-- COMFORT is inserted with INSERT IGNORE so re-running is safe.

INSERT IGNORE INTO `package_categories` (`id`, `category_code`, `name`, `is_active`, `created_at`, `updated_at`, `is_deleted`)
VALUES ('01J6Q0000000000000000000C1', 'COMFORT', 'Comfort', true, NOW(), NOW(), false);
--> statement-breakpoint
-- Reassign templates from STANDARD/VIP to COMFORT.
UPDATE `package_templates`
SET `package_category_id` = (
  SELECT `id` FROM `package_categories` WHERE `category_code` = 'COMFORT' LIMIT 1
)
WHERE `package_category_id` IN (
  SELECT `id` FROM (
    SELECT `id` FROM `package_categories` WHERE `category_code` IN ('STANDARD', 'VIP')
  ) AS `old_cat_ids`
);
--> statement-breakpoint
-- Delete STANDARD and VIP categories.
DELETE FROM `package_categories` WHERE `category_code` IN ('STANDARD', 'VIP');
