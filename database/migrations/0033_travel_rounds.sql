CREATE TABLE `travel_rounds` (
  `id` varchar(26) NOT NULL,
  `round_number` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `departure_date` date NOT NULL,
  `return_date` date NOT NULL,
  `status` enum('PLANNING','OPEN','CLOSED','COMPLETED') NOT NULL DEFAULT 'PLANNING',
  `next_registration_sequence` int NOT NULL DEFAULT 1,
  `remarks` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(26),
  `updated_by` varchar(26),
  `is_deleted` boolean NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_rounds_round_number_unique` (`round_number`),
  KEY `travel_rounds_status_idx` (`status`),
  KEY `travel_rounds_departure_date_idx` (`departure_date`)
);
ALTER TABLE `registrations` ADD `travel_round_id` varchar(26) NULL AFTER `package_version_id`;
ALTER TABLE `registrations` ADD KEY `registrations_travel_round_id_idx` (`travel_round_id`);
ALTER TABLE `registrations`
  ADD CONSTRAINT `registrations_travel_round_id_fk`
  FOREIGN KEY (`travel_round_id`) REFERENCES `travel_rounds`(`id`);
