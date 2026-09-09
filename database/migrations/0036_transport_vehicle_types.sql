CREATE TABLE `vehicle_types` (
  `id` char(26) NOT NULL,
  `type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` boolean NOT NULL DEFAULT false,
  `deleted_at` datetime,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_types_type_code_unique` (`type_code`)
);--> statement-breakpoint
ALTER TABLE `transport_segments`
  ADD COLUMN `vehicle_type_id` char(26) NULL AFTER `vendor_id`,
  ADD COLUMN `vehicle_plate_number` varchar(30) NULL AFTER `vehicle_type_id`,
  ADD KEY `transport_segments_vehicle_type_id_idx` (`vehicle_type_id`),
  ADD KEY `transport_segments_vehicle_plate_idx` (`vehicle_plate_number`),
  ADD CONSTRAINT `transport_segments_vehicle_type_id_fk`
    FOREIGN KEY (`vehicle_type_id`) REFERENCES `vehicle_types`(`id`);
