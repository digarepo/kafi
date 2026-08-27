-- Accommodation workflow: add hotel_name, booking_reference, sequence_order to group_hotel_stays;
-- make hotel_id nullable (MVP allows manual hotel name entry without master catalog).
ALTER TABLE `group_hotel_stays`
  ADD COLUMN `hotel_name` varchar(255) NULL AFTER `hotel_id`,
  ADD COLUMN `booking_reference` varchar(120) NULL AFTER `hotel_name`,
  ADD COLUMN `sequence_order` int NOT NULL DEFAULT 1 AFTER `booking_reference`,
  MODIFY COLUMN `hotel_id` char(26) NULL;--> statement-breakpoint

-- Add unique constraint on (travel_group_id, sequence_order) to prevent duplicate ordering.
ALTER TABLE `group_hotel_stays`
  ADD UNIQUE KEY `group_hotel_stays_travel_group_sequence_unique` (`travel_group_id`, `sequence_order`);--> statement-breakpoint

-- Add index on sequence_order for chronological listing.
ALTER TABLE `group_hotel_stays`
  ADD INDEX `group_hotel_stays_sequence_order_idx` (`sequence_order`);
