ALTER TABLE `travel_rounds`
  ADD COLUMN `deleted_at` datetime NULL AFTER `is_deleted`;
