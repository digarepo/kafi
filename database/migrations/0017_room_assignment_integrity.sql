-- Fix ineffective unique constraint on room_assignments.
--
-- The old constraint (group_membership_id, group_hotel_stay_id, is_active_assignment)
-- was ineffective because is_active_assignment is nullable and MariaDB treats each
-- NULL as distinct in unique indexes — allowing duplicate active assignments.
--
-- Solution: add an application-managed column that is non-NULL only when the
-- assignment is active, then place the unique constraint on that column alone.
-- The application sets it to `membershipId|stayId` on create/reassign and NULL
-- on release.

ALTER TABLE `room_assignments`
  ADD COLUMN `active_membership_stay_key` varchar(79) DEFAULT NULL;--> statement-breakpoint

-- Backfill existing active assignments
UPDATE `room_assignments`
  SET `active_membership_stay_key` = CONCAT(`group_membership_id`, '|', `group_hotel_stay_id`)
  WHERE `is_active_assignment` = 1 AND `is_deleted` = 0;--> statement-breakpoint

ALTER TABLE `room_assignments`
  DROP INDEX `room_assignments_active_unique`;--> statement-breakpoint

ALTER TABLE `room_assignments`
  ADD UNIQUE KEY `room_assignments_active_unique` (`active_membership_stay_key`);
