-- Flight bookings: create flight_booking_statuses and flight_bookings tables.
CREATE TABLE `flight_booking_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `display_order` int NOT NULL DEFAULT 1,
  `is_active` int NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` boolean NOT NULL DEFAULT false,
  `deleted_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flight_booking_statuses_status_code_unique` (`status_code`)
);--> statement-breakpoint

CREATE TABLE `flight_bookings` (
  `id` char(26) NOT NULL,
  `booking_number` varchar(30) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `flight_booking_status_id` char(26) NOT NULL,
  `pnr` varchar(50) NOT NULL,
  `departure_flight_number` varchar(50) NOT NULL,
  `departure_date` date NOT NULL,
  `return_flight_number` varchar(50),
  `return_date` date,
  `cancellation_date` date,
  `cancellation_reason` text,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(26),
  `updated_by` char(26),
  `is_deleted` boolean NOT NULL DEFAULT false,
  `deleted_at` timestamp,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flight_bookings_booking_number_unique` (`booking_number`),
  INDEX `flight_bookings_registration_id_idx` (`registration_id`),
  INDEX `flight_bookings_status_id_idx` (`flight_booking_status_id`),
  CONSTRAINT `flight_bookings_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`),
  CONSTRAINT `flight_bookings_status_id_fk` FOREIGN KEY (`flight_booking_status_id`) REFERENCES `flight_booking_statuses`(`id`),
  CONSTRAINT `flight_bookings_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  CONSTRAINT `flight_bookings_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
);--> statement-breakpoint

-- Seed flight booking statuses (ULIDs are 26-char strings; these are deterministic placeholders)
INSERT INTO `flight_booking_statuses` (`id`, `status_code`, `name`, `display_order`, `is_active`) VALUES
  ('01JZFLIGHTSTATUS0001A', 'CONFIRMED', 'Confirmed', 1, 1),
  ('01JZFLIGHTSTATUS0002B', 'CANCELLED', 'Cancelled', 2, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `is_active` = 1;
