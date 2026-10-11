-- Add planned flight schedules to travel groups and link bookings to groups.

ALTER TABLE `travel_groups`
  ADD COLUMN `departure_airline_id` char(26) NULL AFTER `return_date`,
  ADD COLUMN `departure_flight_number` varchar(50) NULL AFTER `departure_airline_id`,
  ADD COLUMN `return_airline_id` char(26) NULL AFTER `departure_flight_number`,
  ADD COLUMN `return_flight_number` varchar(50) NULL AFTER `return_airline_id`,
  ADD INDEX `travel_groups_departure_airline_id_idx` (`departure_airline_id`),
  ADD INDEX `travel_groups_return_airline_id_idx` (`return_airline_id`),
  ADD CONSTRAINT `travel_groups_departure_airline_id_fk`
    FOREIGN KEY (`departure_airline_id`) REFERENCES `airlines` (`id`),
  ADD CONSTRAINT `travel_groups_return_airline_id_fk`
    FOREIGN KEY (`return_airline_id`) REFERENCES `airlines` (`id`);--> statement-breakpoint

ALTER TABLE `flight_bookings`
  ADD COLUMN `travel_group_id` char(26) NULL AFTER `registration_id`,
  ADD INDEX `flight_bookings_travel_group_id_idx` (`travel_group_id`),
  ADD CONSTRAINT `flight_bookings_travel_group_id_fk`
    FOREIGN KEY (`travel_group_id`) REFERENCES `travel_groups` (`id`);
