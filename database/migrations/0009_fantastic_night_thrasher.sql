CREATE TABLE `group_hotel_stay_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `group_hotel_stay_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_hotel_stay_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `group_hotel_stays` (
	`id` char(26) NOT NULL,
	`stay_number` varchar(30) NOT NULL,
	`travel_group_id` char(26) NOT NULL,
	`hotel_id` char(26) NOT NULL,
	`city_id` char(26) NOT NULL,
	`check_in_date` date NOT NULL,
	`check_out_date` date NOT NULL,
	`group_hotel_stay_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `group_hotel_stays_id` PRIMARY KEY(`id`),
	CONSTRAINT `group_hotel_stays_stay_number_unique` UNIQUE(`stay_number`)
);
--> statement-breakpoint
CREATE TABLE `hotel_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `hotel_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `hotel_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `hotel_types` (
	`id` char(26) NOT NULL,
	`type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `hotel_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `hotel_types_type_code_unique` UNIQUE(`type_code`)
);
--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` char(26) NOT NULL,
	`hotel_code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`address` text,
	`city` varchar(100),
	`country` varchar(100),
	`phone_number` varchar(30),
	`email_address` varchar(255),
	`hotel_type_id` char(26),
	`hotel_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `hotels_id` PRIMARY KEY(`id`),
	CONSTRAINT `hotels_hotel_code_unique` UNIQUE(`hotel_code`)
);
--> statement-breakpoint
CREATE TABLE `room_assignment_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `room_assignment_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_assignment_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `room_assignments` (
	`id` char(26) NOT NULL,
	`room_id` char(26) NOT NULL,
	`group_hotel_stay_id` char(26) NOT NULL,
	`group_membership_id` char(26) NOT NULL,
	`assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`released_at` datetime,
	`bed_number` varchar(20),
	`room_assignment_status_id` char(26) NOT NULL,
	`is_active_assignment` boolean DEFAULT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `room_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_assignments_active_unique` UNIQUE(`group_membership_id`,`group_hotel_stay_id`,`is_active_assignment`)
);
--> statement-breakpoint
CREATE TABLE `room_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `room_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `room_types` (
	`id` char(26) NOT NULL,
	`type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `room_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `room_types_type_code_unique` UNIQUE(`type_code`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` char(26) NOT NULL,
	`room_code` varchar(30),
	`group_hotel_stay_id` char(26) NOT NULL,
	`room_number` varchar(50) NOT NULL,
	`capacity` int NOT NULL,
	`gender_restriction` enum('Female','Male'),
	`room_type_id` char(26),
	`room_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_group_hotel_stay_room_number_unique` UNIQUE(`group_hotel_stay_id`,`room_number`)
);
--> statement-breakpoint
CREATE TABLE `transport_segment_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `transport_segment_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_segment_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `transport_segments` (
	`id` char(26) NOT NULL,
	`transport_segment_number` varchar(30) NOT NULL,
	`travel_group_id` char(26) NOT NULL,
	`vendor_id` char(26) NOT NULL,
	`transport_type` enum('BUS','COASTER','VAN','SEDAN','SUV','OTHER') NOT NULL,
	`segment_order` int NOT NULL,
	`origin_location` varchar(255) NOT NULL,
	`destination_location` varchar(255) NOT NULL,
	`origin_type` enum('AIRPORT','HOTEL','RELIGIOUS_SITE','OTHER'),
	`destination_type` enum('AIRPORT','HOTEL','RELIGIOUS_SITE','OTHER'),
	`departure_datetime` datetime,
	`arrival_datetime` datetime,
	`vehicle_identifier` varchar(100),
	`driver_name` varchar(255),
	`driver_phone_number` varchar(30),
	`transport_segment_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `transport_segments_id` PRIMARY KEY(`id`),
	CONSTRAINT `transport_segments_transport_segment_number_unique` UNIQUE(`transport_segment_number`),
	CONSTRAINT `transport_segments_travel_group_order_unique` UNIQUE(`travel_group_id`,`segment_order`)
);
--> statement-breakpoint
CREATE TABLE `vendor_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `vendor_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `vendor_types` (
	`id` char(26) NOT NULL,
	`type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `vendor_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_types_type_code_unique` UNIQUE(`type_code`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` char(26) NOT NULL,
	`vendor_number` varchar(30) NOT NULL,
	`name` varchar(255) NOT NULL,
	`vendor_type_id` char(26) NOT NULL,
	`contact_person_name` varchar(255),
	`phone_number` varchar(30),
	`alternate_phone_number` varchar(30),
	`email_address` varchar(255),
	`address` text,
	`tax_identification_number` varchar(100),
	`license_number` varchar(100),
	`vendor_status_id` char(26) NOT NULL,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendors_vendor_number_unique` UNIQUE(`vendor_number`)
);
--> statement-breakpoint
CREATE INDEX `group_hotel_stays_travel_group_id_idx` ON `group_hotel_stays` (`travel_group_id`);--> statement-breakpoint
CREATE INDEX `group_hotel_stays_hotel_id_idx` ON `group_hotel_stays` (`hotel_id`);--> statement-breakpoint
CREATE INDEX `group_hotel_stays_city_id_idx` ON `group_hotel_stays` (`city_id`);--> statement-breakpoint
CREATE INDEX `group_hotel_stays_check_in_date_idx` ON `group_hotel_stays` (`check_in_date`);--> statement-breakpoint
CREATE INDEX `hotels_hotel_status_id_idx` ON `hotels` (`hotel_status_id`);--> statement-breakpoint
CREATE INDEX `hotels_hotel_type_id_idx` ON `hotels` (`hotel_type_id`);--> statement-breakpoint
CREATE INDEX `room_assignments_room_id_idx` ON `room_assignments` (`room_id`);--> statement-breakpoint
CREATE INDEX `room_assignments_group_hotel_stay_id_idx` ON `room_assignments` (`group_hotel_stay_id`);--> statement-breakpoint
CREATE INDEX `room_assignments_group_membership_id_idx` ON `room_assignments` (`group_membership_id`);--> statement-breakpoint
CREATE INDEX `rooms_group_hotel_stay_id_idx` ON `rooms` (`group_hotel_stay_id`);--> statement-breakpoint
CREATE INDEX `rooms_room_status_id_idx` ON `rooms` (`room_status_id`);--> statement-breakpoint
CREATE INDEX `transport_segments_travel_group_id_idx` ON `transport_segments` (`travel_group_id`);--> statement-breakpoint
CREATE INDEX `transport_segments_vendor_id_idx` ON `transport_segments` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `transport_segments_departure_datetime_idx` ON `transport_segments` (`departure_datetime`);--> statement-breakpoint
CREATE INDEX `vendors_vendor_status_id_idx` ON `vendors` (`vendor_status_id`);--> statement-breakpoint
CREATE INDEX `vendors_vendor_type_id_idx` ON `vendors` (`vendor_type_id`);

-- Keep is_active_assignment in sync with the current assignment status.
-- A generated column cannot reference another table, so BEFORE triggers
-- derive the active flag from room_assignment_statuses.status_code.
DELIMITER //
CREATE TRIGGER `room_assignments_set_active_before_insert`
BEFORE INSERT ON `room_assignments`
FOR EACH ROW
BEGIN
  SET NEW.is_active_assignment = IF (
    EXISTS (
      SELECT 1 FROM `room_assignment_statuses`
      WHERE `id` = NEW.room_assignment_status_id
        AND `status_code` = 'ASSIGNED'
        AND `is_deleted` = false
    ),
    TRUE,
    NULL
  );
END//

CREATE TRIGGER `room_assignments_set_active_before_update`
BEFORE UPDATE ON `room_assignments`
FOR EACH ROW
BEGIN
  SET NEW.is_active_assignment = IF (
    EXISTS (
      SELECT 1 FROM `room_assignment_statuses`
      WHERE `id` = NEW.room_assignment_status_id
        AND `status_code` = 'ASSIGNED'
        AND `is_deleted` = false
    ),
    TRUE,
    NULL
  );
END//
DELIMITER ;
