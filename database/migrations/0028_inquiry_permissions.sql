-- Inquiry permissions — INQUIRY_VIEW and INQUIRY_MANAGE were added to the seed
-- script alongside the public inquiries feature (migration 0022) but were never
-- included in a migration. Production databases seeded before the inquiries
-- feature are missing these two permission rows and their role mappings, which
-- causes the admin sidebar and topbar notification badge to hide the inquiry
-- inbox for all users regardless of role.
--
-- This migration is idempotent: INSERT IGNORE skips rows that already exist
-- (permission_code is unique; role_permissions has a unique (role_id,
-- permission_id) constraint).

INSERT IGNORE INTO `permissions` (`id`, `permission_code`, `name`, `module`, `created_at`, `updated_at`, `is_deleted`) VALUES
  ('01J6Q00000000000000000000V', 'INQUIRY_VIEW', 'View inquiries', 'Inquiries', NOW(), NOW(), false),
  ('01J6Q00000000000000000000W', 'INQUIRY_MANAGE', 'Manage inquiries', 'Inquiries', NOW(), NOW(), false);
--> statement-breakpoint
-- ADMIN → INQUIRY_VIEW
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000010', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'ADMIN' AND p.permission_code = 'INQUIRY_VIEW';
--> statement-breakpoint
-- ADMIN → INQUIRY_MANAGE
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000011', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'ADMIN' AND p.permission_code = 'INQUIRY_MANAGE';
--> statement-breakpoint
-- MANAGER → INQUIRY_VIEW
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000012', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'MANAGER' AND p.permission_code = 'INQUIRY_VIEW';
--> statement-breakpoint
-- MANAGER → INQUIRY_MANAGE
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000013', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'MANAGER' AND p.permission_code = 'INQUIRY_MANAGE';
--> statement-breakpoint
-- AGENT → INQUIRY_VIEW
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000014', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'AGENT' AND p.permission_code = 'INQUIRY_VIEW';
--> statement-breakpoint
-- AGENT → INQUIRY_MANAGE
INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`, `updated_at`, `is_deleted`)
SELECT '01J6Q000000000000000000015', r.id, p.id, NOW(), NOW(), false
FROM `roles` r CROSS JOIN `permissions` p
WHERE r.role_code = 'AGENT' AND p.permission_code = 'INQUIRY_MANAGE';
