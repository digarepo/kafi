-- Remove the LOCKED user status. Any users currently in LOCKED are migrated
-- to SUSPENDED, which serves the same operational purpose (account is
-- temporarily prevented from logging in by an admin action).
UPDATE `users`
SET `user_status_id` = (
  SELECT `id` FROM `user_statuses` WHERE `status_code` = 'SUSPENDED' LIMIT 1
)
WHERE `user_status_id` = (
  SELECT `id` FROM `user_statuses` WHERE `status_code` = 'LOCKED' LIMIT 1
);
--> statement-breakpoint
DELETE FROM `user_statuses` WHERE `status_code` = 'LOCKED';
