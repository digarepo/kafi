CREATE TABLE `document_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `document_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `document_types` (
	`id` char(26) NOT NULL,
	`type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `document_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_types_type_code_unique` UNIQUE(`type_code`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` char(26) NOT NULL,
	`document_number` varchar(30) NOT NULL,
	`traveller_id` char(26),
	`registration_id` char(26),
	`document_type_id` char(26) NOT NULL,
	`original_filename` varchar(255),
	`stored_filename` varchar(255),
	`mime_type` varchar(100),
	`file_size` bigint NOT NULL DEFAULT 0,
	`storage_path` text,
	`verification_status_id` char(26) NOT NULL,
	`verified_by` char(26),
	`verified_at` datetime,
	`expiry_date` date,
	`document_status_id` char(26) NOT NULL,
	`remarks` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `documents_document_number_unique` UNIQUE(`document_number`)
);
--> statement-breakpoint
CREATE TABLE `verification_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `verification_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `visa_application_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`display_order` int NOT NULL DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `visa_application_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `visa_application_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `visa_applications` (
	`id` char(26) NOT NULL,
	`application_number` varchar(30) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`submission_date` date,
	`approval_date` date,
	`expiry_date` date,
	`visa_number` varchar(100),
	`visa_application_status_id` char(26) NOT NULL,
	`is_approved` boolean,
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `visa_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `visa_applications_application_number_unique` UNIQUE(`application_number`),
	CONSTRAINT `visa_applications_approved_unique` UNIQUE(`registration_id`,`is_approved`)
);
--> statement-breakpoint
ALTER TABLE `room_assignments` MODIFY COLUMN `is_active_assignment` boolean;--> statement-breakpoint
CREATE INDEX `documents_traveller_id_idx` ON `documents` (`traveller_id`);--> statement-breakpoint
CREATE INDEX `documents_registration_id_idx` ON `documents` (`registration_id`);--> statement-breakpoint
CREATE INDEX `documents_document_type_id_idx` ON `documents` (`document_type_id`);--> statement-breakpoint
CREATE INDEX `documents_document_status_id_idx` ON `documents` (`document_status_id`);--> statement-breakpoint
CREATE INDEX `documents_verification_status_id_idx` ON `documents` (`verification_status_id`);--> statement-breakpoint
CREATE INDEX `visa_applications_registration_id_idx` ON `visa_applications` (`registration_id`);--> statement-breakpoint
CREATE INDEX `visa_applications_status_id_idx` ON `visa_applications` (`visa_application_status_id`);

--> statement-breakpoint
-- Enforce that a document must be owned by a traveller or a registration.
DELIMITER //
CREATE TRIGGER `documents_check_owner_before_insert`
BEFORE INSERT ON `documents`
FOR EACH ROW
BEGIN
  IF (NEW.traveller_id IS NULL AND NEW.registration_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Document must be owned by a traveller or a registration';
  END IF;
END//

CREATE TRIGGER `documents_check_owner_before_update`
BEFORE UPDATE ON `documents`
FOR EACH ROW
BEGIN
  IF (NEW.traveller_id IS NULL AND NEW.registration_id IS NULL) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Document must be owned by a traveller or a registration';
  END IF;
END//
DELIMITER ;

--> statement-breakpoint
-- Maintain is_approved for the partial-unique approved-visa constraint.
DELIMITER //
CREATE TRIGGER `visa_applications_set_approved_before_insert`
BEFORE INSERT ON `visa_applications`
FOR EACH ROW
BEGIN
  SET NEW.is_approved = IF (
    EXISTS (
      SELECT 1 FROM `visa_application_statuses`
      WHERE `id` = NEW.visa_application_status_id
        AND `status_code` = 'APPROVED'
        AND `is_deleted` = false
    ),
    TRUE,
    NULL
  );
END//

CREATE TRIGGER `visa_applications_set_approved_before_update`
BEFORE UPDATE ON `visa_applications`
FOR EACH ROW
BEGIN
  SET NEW.is_approved = IF (
    EXISTS (
      SELECT 1 FROM `visa_application_statuses`
      WHERE `id` = NEW.visa_application_status_id
        AND `status_code` = 'APPROVED'
        AND `is_deleted` = false
    ),
    TRUE,
    NULL
  );
END//
DELIMITER ;
