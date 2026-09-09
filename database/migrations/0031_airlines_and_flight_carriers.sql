-- Add airline reference data and optional carrier links for historical flight bookings.
CREATE TABLE `airlines` (
  `id` char(26) NOT NULL,
  `iata_code` varchar(2) NOT NULL,
  `icao_code` varchar(3) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `display_order` int NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` boolean NOT NULL DEFAULT false,
  `deleted_at` datetime,
  PRIMARY KEY (`id`),
  UNIQUE KEY `airlines_iata_code_unique` (`iata_code`),
  UNIQUE KEY `airlines_icao_code_unique` (`icao_code`)
);--> statement-breakpoint

ALTER TABLE `flight_bookings`
  ADD COLUMN `departure_airline_id` char(26) NULL AFTER `flight_booking_status_id`,
  ADD COLUMN `return_airline_id` char(26) NULL AFTER `return_flight_number`,
  ADD INDEX `flight_bookings_departure_airline_id_idx` (`departure_airline_id`),
  ADD INDEX `flight_bookings_return_airline_id_idx` (`return_airline_id`),
  ADD CONSTRAINT `flight_bookings_departure_airline_id_fk`
    FOREIGN KEY (`departure_airline_id`) REFERENCES `airlines`(`id`),
  ADD CONSTRAINT `flight_bookings_return_airline_id_fk`
    FOREIGN KEY (`return_airline_id`) REFERENCES `airlines`(`id`);--> statement-breakpoint

INSERT INTO `airlines` (`id`, `iata_code`, `icao_code`, `name`, `display_order`, `is_active`) VALUES
  ('01M1XTBVSQN6C60NBDCDEEFPRA', 'ET', 'ETH', 'Ethiopian Airlines', 1, 1),
  ('01M1XTBVSQ48HCR5HE913V127A', 'SV', 'SVA', 'Saudia', 2, 1),
  ('01M1XTBVSQCBV6T0XHFQ4VPCK5', 'EK', 'UAE', 'Emirates', 3, 1),
  ('01M1XTBVSQ0P3X4XEXZ5RRAQHJ', 'QR', 'QTR', 'Qatar Airways', 4, 1),
  ('01M1XTBVSQ27ZPVNEB1FWNVQ53', 'TK', 'THY', 'Turkish Airlines', 5, 1),
  ('01M1XTBVSQBA9SXGVK6KWHMV0M', 'MS', 'MSR', 'Egyptair', 6, 1)
ON DUPLICATE KEY UPDATE
  `icao_code` = VALUES(`icao_code`),
  `name` = VALUES(`name`),
  `display_order` = VALUES(`display_order`),
  `is_active` = 1,
  `is_deleted` = 0,
  `deleted_at` = NULL;