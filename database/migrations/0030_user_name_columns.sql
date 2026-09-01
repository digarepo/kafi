-- Add first_name, middle_name, and last_name columns to users table.
-- Ethiopian naming convention: first name + father's name (middle_name).
-- last_name is optional (family/grandfather name) and not shown by default.
-- full_name is kept for backward compatibility and populated from the new columns.

ALTER TABLE `users`
  ADD COLUMN `first_name` varchar(100) NULL AFTER `full_name`,
  ADD COLUMN `middle_name` varchar(100) NULL AFTER `first_name`,
  ADD COLUMN `last_name` varchar(100) NULL AFTER `middle_name`;
--> statement-breakpoint
-- Populate first_name and middle_name from existing full_name.
-- Split on first space: first_name = first token, middle_name = rest.
UPDATE `users`
SET `first_name` = SUBSTRING_INDEX(`full_name`, ' ', 1),
    `middle_name` = TRIM(SUBSTRING(`full_name`, LENGTH(SUBSTRING_INDEX(`full_name`, ' ', 1)) + 2))
WHERE `first_name` IS NULL AND `full_name` IS NOT NULL;
--> statement-breakpoint
-- Set first_name to full_name if no space was found.
UPDATE `users` SET `first_name` = `full_name`
WHERE `first_name` IS NULL OR `first_name` = '';
--> statement-breakpoint
-- Make first_name NOT NULL after backfill.
ALTER TABLE `users` MODIFY COLUMN `first_name` varchar(100) NOT NULL;
