CREATE TABLE `analytics_events` (
  `id` char(26) NOT NULL,
  `event_name` varchar(50) NOT NULL,
  `event_type` enum('custom','conversion') NOT NULL DEFAULT 'custom',
  `anonymous_visitor_id` varchar(36) DEFAULT NULL,
  `page_path` varchar(500) DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `utm_source` varchar(150) DEFAULT NULL,
  `utm_medium` varchar(150) DEFAULT NULL,
  `utm_campaign` varchar(150) DEFAULT NULL,
  `utm_content` varchar(150) DEFAULT NULL,
  `utm_term` varchar(150) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload`)),
  `inquiry_id` varchar(26) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `analytics_events_name_type_created_idx` (`event_name`,`event_type`,`created_at`),
  KEY `analytics_events_visitor_id_idx` (`anonymous_visitor_id`),
  KEY `analytics_events_inquiry_id_idx` (`inquiry_id`),
  KEY `analytics_events_utm_source_created_idx` (`utm_source`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auth_audit_logs` (
  `id` char(26) NOT NULL,
  `user_id` char(26) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 1,
  `details` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cities` (
  `id` char(26) NOT NULL,
  `country_id` char(26) NOT NULL,
  `region_id` char(26) DEFAULT NULL,
  `geoname_id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `population` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cities_geoname_id_unique` (`geoname_id`),
  KEY `cities_country_id_idx` (`country_id`),
  KEY `cities_region_id_idx` (`region_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contact_persons` (
  `id` char(26) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `gender` enum('Female','Male') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone_number` varchar(30) NOT NULL,
  `alternate_phone_number` varchar(30) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `country_id` char(26) DEFAULT NULL,
  `region_id` char(26) DEFAULT NULL,
  `preferred_language_id` char(26) DEFAULT NULL,
  `contact_person_status_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contact_persons_phone_number_unique` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `contact_person_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contact_person_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `countries` (
  `id` char(26) NOT NULL,
  `iso_code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `countries_iso_code_unique` (`iso_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `credit_exception_requests` (
  `id` char(26) NOT NULL,
  `request_number` varchar(30) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `requested_amount` decimal(18,2) NOT NULL,
  `reason` text NOT NULL,
  `requested_due_date` datetime DEFAULT NULL,
  `requested_by` char(26) NOT NULL,
  `credit_exception_request_status_id` char(26) NOT NULL,
  `active_request_lock` char(26) DEFAULT NULL,
  `reviewed_by` char(26) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `finance_exception_id` char(26) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `credit_exception_requests_request_number_unique` (`request_number`),
  UNIQUE KEY `credit_exception_requests_active_per_registration_unique` (`registration_id`,`active_request_lock`),
  KEY `credit_exception_requests_registration_id_idx` (`registration_id`),
  KEY `credit_exception_requests_status_id_idx` (`credit_exception_request_status_id`),
  KEY `credit_exception_requests_requested_by_idx` (`requested_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `credit_exception_request_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `credit_exception_request_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `currencies` (
  `id` char(26) NOT NULL,
  `currency_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `symbol` varchar(10) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `currencies_currency_code_unique` (`currency_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `documents` (
  `id` char(26) NOT NULL,
  `document_number` varchar(30) NOT NULL,
  `traveller_id` char(26) DEFAULT NULL,
  `registration_id` char(26) DEFAULT NULL,
  `document_type_id` char(26) NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `stored_filename` varchar(255) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint(20) NOT NULL DEFAULT 0,
  `storage_path` text DEFAULT NULL,
  `verification_status_id` char(26) NOT NULL,
  `verified_by` char(26) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `document_status_id` char(26) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `documents_document_number_unique` (`document_number`),
  KEY `documents_traveller_id_idx` (`traveller_id`),
  KEY `documents_registration_id_idx` (`registration_id`),
  KEY `documents_document_type_id_idx` (`document_type_id`),
  KEY `documents_document_status_id_idx` (`document_status_id`),
  KEY `documents_verification_status_id_idx` (`verification_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_types` (
  `id` char(26) NOT NULL,
  `type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_types_type_code_unique` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `email_verification_tokens` (
  `id` char(26) NOT NULL,
  `user_id` char(26) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_verification_tokens_token_hash_unique` (`token_hash`),
  KEY `email_verification_tokens_user_id_idx` (`user_id`),
  KEY `email_verification_tokens_expires_at_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expenses` (
  `id` char(26) NOT NULL,
  `expense_number` varchar(30) NOT NULL,
  `expense_category_id` char(26) NOT NULL,
  `expense_source_id` char(26) NOT NULL,
  `expense_status_id` char(26) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `original_amount` decimal(18,2) DEFAULT NULL,
  `original_currency_id` char(26) DEFAULT NULL,
  `exchange_rate` decimal(18,6) DEFAULT NULL,
  `expense_date` datetime NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `vendor_id` char(26) DEFAULT NULL,
  `payee_name` varchar(255) DEFAULT NULL,
  `attribution_scope` enum('TRAVELER','GROUP','GENERAL') NOT NULL,
  `traveller_id` char(26) DEFAULT NULL,
  `registration_id` char(26) DEFAULT NULL,
  `travel_group_id` char(26) DEFAULT NULL,
  `package_version_id` char(26) DEFAULT NULL,
  `source_visa_application_id` char(26) DEFAULT NULL,
  `source_flight_booking_id` char(26) DEFAULT NULL,
  `source_group_hotel_stay_id` char(26) DEFAULT NULL,
  `source_transport_segment_id` char(26) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expenses_expense_number_unique` (`expense_number`),
  UNIQUE KEY `uq_expenses_source_visa_application` (`source_visa_application_id`),
  UNIQUE KEY `uq_expenses_source_flight_booking` (`source_flight_booking_id`),
  UNIQUE KEY `uq_expenses_source_group_hotel_stay` (`source_group_hotel_stay_id`),
  UNIQUE KEY `uq_expenses_source_transport_segment` (`source_transport_segment_id`),
  KEY `expenses_category_id_idx` (`expense_category_id`),
  KEY `expenses_source_id_idx` (`expense_source_id`),
  KEY `expenses_status_id_idx` (`expense_status_id`),
  KEY `expenses_traveller_id_idx` (`traveller_id`),
  KEY `expenses_registration_id_idx` (`registration_id`),
  KEY `expenses_travel_group_id_idx` (`travel_group_id`),
  KEY `expenses_package_version_id_idx` (`package_version_id`),
  KEY `expenses_expense_date_idx` (`expense_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_adjustments` (
  `id` char(26) NOT NULL,
  `adjustment_number` varchar(30) NOT NULL,
  `expense_id` char(26) NOT NULL,
  `adjustment_type` enum('SUPPLIER_REFUND','CANCELLATION_FEE','OTHER_ADJUSTMENT') NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `adjustment_date` datetime NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `reason` text NOT NULL,
  `source_record_type` enum('FLIGHT_BOOKING','GROUP_HOTEL_STAY','TRANSPORT_SEGMENT','VISA_APPLICATION','REGISTRATION') NOT NULL,
  `source_record_id` char(26) NOT NULL,
  `source_record_number` varchar(30) DEFAULT NULL,
  `traveller_id` char(26) DEFAULT NULL,
  `registration_id` char(26) DEFAULT NULL,
  `travel_group_id` char(26) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_adjustments_adjustment_number_unique` (`adjustment_number`),
  UNIQUE KEY `expense_adjustments_expense_type_unique` (`expense_id`,`adjustment_type`),
  KEY `expense_adjustments_expense_id_idx` (`expense_id`),
  KEY `expense_adjustments_source_record_idx` (`source_record_id`,`source_record_type`),
  KEY `expense_adjustments_traveller_id_idx` (`traveller_id`),
  KEY `expense_adjustments_registration_id_idx` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_allocations` (
  `id` char(26) NOT NULL,
  `expense_id` char(26) NOT NULL,
  `traveller_id` char(26) NOT NULL,
  `registration_id` char(26) DEFAULT NULL,
  `allocated_amount` decimal(18,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_allocations_expense_traveller_unique` (`expense_id`,`traveller_id`),
  KEY `expense_allocations_expense_id_idx` (`expense_id`),
  KEY `expense_allocations_traveller_id_idx` (`traveller_id`),
  KEY `expense_allocations_registration_id_idx` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_categories` (
  `id` char(26) NOT NULL,
  `category_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_categories_category_code_unique` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_sources` (
  `id` char(26) NOT NULL,
  `source_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_sources_source_code_unique` (`source_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expense_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `expense_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `finance_exceptions` (
  `id` char(26) NOT NULL,
  `exception_number` varchar(30) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `authorized_amount` decimal(18,2) NOT NULL,
  `reason` text NOT NULL,
  `approved_by` char(26) NOT NULL,
  `approved_at` datetime NOT NULL,
  `due_date` datetime DEFAULT NULL,
  `finance_exception_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `active_lock` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `finance_exceptions_exception_number_unique` (`exception_number`),
  UNIQUE KEY `finance_exceptions_active_per_registration_unique` (`registration_id`,`active_lock`),
  KEY `finance_exceptions_registration_id_idx` (`registration_id`),
  KEY `finance_exceptions_status_id_idx` (`finance_exception_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `finance_exception_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `finance_exception_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `flight_bookings` (
  `id` char(26) NOT NULL,
  `booking_number` varchar(30) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `flight_booking_status_id` char(26) NOT NULL,
  `pnr` varchar(50) NOT NULL,
  `departure_flight_number` varchar(50) NOT NULL,
  `departure_date` date NOT NULL,
  `return_flight_number` varchar(50) DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `cancellation_date` date DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `supplier_cost` decimal(18,2) DEFAULT NULL,
  `cancellation_fee` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flight_bookings_booking_number_unique` (`booking_number`),
  KEY `flight_bookings_registration_id_idx` (`registration_id`),
  KEY `flight_bookings_status_id_idx` (`flight_booking_status_id`),
  KEY `flight_bookings_created_by_fk` (`created_by`),
  KEY `flight_bookings_updated_by_fk` (`updated_by`),
  CONSTRAINT `flight_bookings_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `flight_bookings_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`),
  CONSTRAINT `flight_bookings_status_id_fk` FOREIGN KEY (`flight_booking_status_id`) REFERENCES `flight_booking_statuses` (`id`),
  CONSTRAINT `flight_bookings_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `flight_booking_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flight_booking_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `group_hotel_stays` (
  `id` char(26) NOT NULL,
  `stay_number` varchar(30) NOT NULL,
  `travel_group_id` char(26) NOT NULL,
  `hotel_id` char(26) DEFAULT NULL,
  `hotel_name` varchar(255) DEFAULT NULL,
  `booking_reference` varchar(120) DEFAULT NULL,
  `sequence_order` int(11) NOT NULL DEFAULT 1,
  `city_id` char(26) NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `group_hotel_stay_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `accommodation_cost` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_hotel_stays_stay_number_unique` (`stay_number`),
  UNIQUE KEY `group_hotel_stays_travel_group_sequence_unique` (`travel_group_id`,`sequence_order`),
  KEY `group_hotel_stays_travel_group_id_idx` (`travel_group_id`),
  KEY `group_hotel_stays_hotel_id_idx` (`hotel_id`),
  KEY `group_hotel_stays_city_id_idx` (`city_id`),
  KEY `group_hotel_stays_check_in_date_idx` (`check_in_date`),
  KEY `group_hotel_stays_sequence_order_idx` (`sequence_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `group_hotel_stay_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_hotel_stay_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `group_memberships` (
  `id` char(26) NOT NULL,
  `travel_group_id` char(26) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `group_membership_status_id` char(26) NOT NULL,
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `left_at` datetime DEFAULT NULL,
  `transferred_from_group_membership_id` char(26) DEFAULT NULL,
  `guarantee_required` tinyint(1) NOT NULL DEFAULT 1,
  `guarantee_waived` tinyint(1) NOT NULL DEFAULT 0,
  `guarantee_waived_by` char(26) DEFAULT NULL,
  `guarantee_waived_at` datetime DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `group_memberships_travel_group_id_idx` (`travel_group_id`),
  KEY `group_memberships_registration_id_idx` (`registration_id`),
  KEY `group_memberships_status_id_idx` (`group_membership_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `group_membership_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_membership_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `guarantees` (
  `id` char(26) NOT NULL,
  `guarantee_number` varchar(30) NOT NULL,
  `group_membership_id` char(26) DEFAULT NULL,
  `registration_id` char(26) NOT NULL,
  `guarantee_type` enum('PERSON','CASH_DEPOSIT','CPO','BANK_GUARANTEE','OTHER') NOT NULL,
  `guarantee_status` enum('PENDING','ACTIVE','REPLACED','RELEASED','REFUNDED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `contact_person_id` char(26) DEFAULT NULL,
  `instrument_reference` varchar(120) DEFAULT NULL,
  `amount` decimal(18,2) DEFAULT NULL,
  `currency_id` char(26) DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `issuer` varchar(120) DEFAULT NULL,
  `previous_guarantee_id` char(26) DEFAULT NULL,
  `replaced_by_id` char(26) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `guarantees_guarantee_number_unique` (`guarantee_number`),
  UNIQUE KEY `guarantees_instrument_reference_unique` (`instrument_reference`),
  KEY `guarantees_group_membership_id_idx` (`group_membership_id`),
  KEY `guarantees_registration_id_idx` (`registration_id`),
  KEY `guarantees_status_idx` (`guarantee_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotels` (
  `id` char(26) NOT NULL,
  `hotel_code` varchar(30) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `hotel_type_id` char(26) DEFAULT NULL,
  `hotel_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotels_hotel_code_unique` (`hotel_code`),
  KEY `hotels_hotel_status_id_idx` (`hotel_status_id`),
  KEY `hotels_hotel_type_id_idx` (`hotel_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotel_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotel_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotel_types` (
  `id` char(26) NOT NULL,
  `type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hotel_types_type_code_unique` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inquiries` (
  `id` char(26) NOT NULL,
  `inquiry_number` varchar(30) NOT NULL,
  `inquiry_type` enum('BOOKING','CALLBACK','CONTACT','ENQUIRY') NOT NULL,
  `inquiry_status` enum('NEW','CONTACTED','RESOLVED') NOT NULL DEFAULT 'NEW',
  `full_name` varchar(150) DEFAULT NULL,
  `phone_number` varchar(30) NOT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `enquiry_category` varchar(50) DEFAULT NULL,
  `package_interest` varchar(150) DEFAULT NULL,
  `service_interest` varchar(150) DEFAULT NULL,
  `travel_period` varchar(50) DEFAULT NULL,
  `group_size` varchar(20) DEFAULT NULL,
  `source_channel` varchar(50) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `staff_notes` text DEFAULT NULL,
  `handled_by` char(26) DEFAULT NULL,
  `contacted_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `first_viewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `utm_source` varchar(150) DEFAULT NULL,
  `utm_medium` varchar(150) DEFAULT NULL,
  `utm_campaign` varchar(150) DEFAULT NULL,
  `utm_content` varchar(150) DEFAULT NULL,
  `utm_term` varchar(150) DEFAULT NULL,
  `anonymous_visitor_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `inquiries_inquiry_number_unique` (`inquiry_number`),
  KEY `inquiries_status_idx` (`inquiry_status`),
  KEY `inquiries_type_idx` (`inquiry_type`),
  KEY `inquiries_created_at_idx` (`created_at`),
  KEY `inquiries_phone_number_idx` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
  `id` char(26) NOT NULL,
  `invoice_number` varchar(30) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `invoice_date` datetime NOT NULL,
  `due_date` datetime DEFAULT NULL,
  `subtotal` decimal(18,2) NOT NULL,
  `discount_amount` decimal(18,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(18,2) NOT NULL,
  `currency_id` char(26) NOT NULL,
  `invoice_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_invoice_number_unique` (`invoice_number`),
  KEY `invoices_registration_id_idx` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice_line_items` (
  `id` char(26) NOT NULL,
  `invoice_id` char(26) NOT NULL,
  `line_item_type_id` char(26) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(18,2) NOT NULL DEFAULT 1.00,
  `unit_price` decimal(18,2) NOT NULL,
  `total_price` decimal(18,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_line_items_invoice_id_idx` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice_line_item_types` (
  `id` char(26) NOT NULL,
  `line_item_type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_line_item_types_line_item_type_code_unique` (`line_item_type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `languages` (
  `id` char(26) NOT NULL,
  `language_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `languages_language_code_unique` (`language_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_categories` (
  `id` char(26) NOT NULL,
  `category_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_categories_category_code_unique` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_templates` (
  `id` char(26) NOT NULL,
  `package_template_code` varchar(30) NOT NULL,
  `name` varchar(150) NOT NULL,
  `short_name` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `pilgrimage_type_id` char(26) NOT NULL,
  `package_category_id` char(26) NOT NULL,
  `default_duration_days` int(11) NOT NULL,
  `package_template_status_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_templates_package_template_code_unique` (`package_template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_template_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_template_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_versions` (
  `id` char(26) NOT NULL,
  `package_version_code` varchar(30) NOT NULL,
  `package_template_id` char(26) NOT NULL,
  `version_name` varchar(150) NOT NULL,
  `version_number` int(11) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `hero_image_url` varchar(500) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `season_id` char(26) DEFAULT NULL,
  `year` int(11) NOT NULL,
  `departure_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `base_price` decimal(18,2) NOT NULL,
  `currency_id` char(26) NOT NULL,
  `max_capacity` int(11) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `sales_start_date` date DEFAULT NULL,
  `sales_end_date` date DEFAULT NULL,
  `package_version_status_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_versions_package_version_code_unique` (`package_version_code`),
  UNIQUE KEY `package_versions_slug_unique` (`slug`),
  UNIQUE KEY `package_versions_template_version_number_unique` (`package_template_id`,`version_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_version_inclusions` (
  `id` char(26) NOT NULL,
  `package_version_id` char(26) NOT NULL,
  `inclusion_text` varchar(255) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_highlighted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_version_inclusions_order_unique` (`package_version_id`,`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_version_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_version_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `id` char(26) NOT NULL,
  `user_id` char(26) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_tokens_token_hash_unique` (`token_hash`),
  KEY `password_reset_tokens_user_id_idx` (`user_id`),
  KEY `password_reset_tokens_expires_at_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payers` (
  `id` char(26) NOT NULL,
  `payer_number` varchar(30) NOT NULL,
  `payer_type_id` char(26) NOT NULL,
  `traveller_id` char(26) DEFAULT NULL,
  `contact_person_id` char(26) DEFAULT NULL,
  `organization_name` varchar(255) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `payer_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payers_payer_number_unique` (`payer_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payer_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payer_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payer_types` (
  `id` char(26) NOT NULL,
  `type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payer_types_type_code_unique` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` char(26) NOT NULL,
  `payment_number` varchar(30) NOT NULL,
  `payer_id` char(26) NOT NULL,
  `payment_method_id` char(26) NOT NULL,
  `payment_date` datetime NOT NULL,
  `original_amount` decimal(18,2) NOT NULL,
  `original_currency_id` char(26) NOT NULL,
  `exchange_rate` decimal(18,6) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `received_by` char(26) NOT NULL,
  `payment_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_payment_number_unique` (`payment_number`),
  KEY `payments_payer_id_idx` (`payer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_allocations` (
  `id` char(26) NOT NULL,
  `payment_id` char(26) NOT NULL,
  `invoice_id` char(26) NOT NULL,
  `allocated_amount` decimal(18,2) NOT NULL,
  `allocation_date` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_allocations_payment_invoice_unique` (`payment_id`,`invoice_id`),
  KEY `payment_allocations_invoice_id_idx` (`invoice_id`),
  KEY `payment_allocations_payment_id_idx` (`payment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_methods` (
  `id` char(26) NOT NULL,
  `method_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `payment_method_status_id` char(26) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_methods_method_code_unique` (`method_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_method_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_method_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` char(26) NOT NULL,
  `permission_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `module` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_permission_code_unique` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pilgrimage_types` (
  `id` char(26) NOT NULL,
  `pilgrimage_type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pilgrimage_types_pilgrimage_type_code_unique` (`pilgrimage_type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refresh_token_blocklist` (
  `id` char(26) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `user_id` char(26) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_token_blocklist_token_hash_unique` (`token_hash`),
  KEY `refresh_token_blocklist_expires_at_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refunds` (
  `id` char(26) NOT NULL,
  `refund_number` varchar(30) NOT NULL,
  `payment_id` char(26) NOT NULL,
  `payer_id` char(26) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `reason` text NOT NULL,
  `refund_date` datetime NOT NULL,
  `approved_by` char(26) NOT NULL,
  `approved_at` datetime NOT NULL,
  `refund_status_id` char(26) NOT NULL,
  `registration_id` char(26) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refunds_refund_number_unique` (`refund_number`),
  KEY `refunds_payment_id_idx` (`payment_id`),
  KEY `refunds_payer_id_idx` (`payer_id`),
  KEY `refunds_status_id_idx` (`refund_status_id`),
  KEY `refunds_registration_id_idx` (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refund_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `refund_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `regions` (
  `id` char(26) NOT NULL,
  `country_id` char(26) NOT NULL,
  `region_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `regions_region_code_unique` (`region_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registrations` (
  `id` char(26) NOT NULL,
  `registration_number` varchar(30) NOT NULL,
  `traveller_id` char(26) NOT NULL,
  `package_version_id` char(26) NOT NULL,
  `registration_date` datetime NOT NULL DEFAULT current_timestamp(),
  `expected_departure_date` date DEFAULT NULL,
  `expected_return_date` date DEFAULT NULL,
  `registration_status_id` char(26) NOT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` char(26) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registrations_registration_number_unique` (`registration_number`),
  KEY `registrations_cancelled_by_fk` (`cancelled_by`),
  CONSTRAINT `registrations_cancelled_by_fk` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registration_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registration_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `relationship_types` (
  `id` char(26) NOT NULL,
  `relationship_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `relationship_types_relationship_code_unique` (`relationship_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` char(26) NOT NULL,
  `role_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_system_role` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_role_code_unique` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `id` char(26) NOT NULL,
  `role_id` char(26) NOT NULL,
  `permission_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_id_permission_id_unique` (`role_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rooms` (
  `id` char(26) NOT NULL,
  `room_code` varchar(30) DEFAULT NULL,
  `group_hotel_stay_id` char(26) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `capacity` int(11) NOT NULL,
  `gender_restriction` enum('Female','Male') DEFAULT NULL,
  `room_type_id` char(26) DEFAULT NULL,
  `room_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rooms_group_hotel_stay_room_number_unique` (`group_hotel_stay_id`,`room_number`),
  KEY `rooms_group_hotel_stay_id_idx` (`group_hotel_stay_id`),
  KEY `rooms_room_status_id_idx` (`room_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `room_assignments` (
  `id` char(26) NOT NULL,
  `room_id` char(26) NOT NULL,
  `group_hotel_stay_id` char(26) NOT NULL,
  `group_membership_id` char(26) NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `released_at` datetime DEFAULT NULL,
  `bed_number` varchar(20) DEFAULT NULL,
  `room_assignment_status_id` char(26) NOT NULL,
  `is_active_assignment` tinyint(1) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `active_membership_stay_key` varchar(79) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_assignments_active_unique` (`active_membership_stay_key`),
  KEY `room_assignments_room_id_idx` (`room_id`),
  KEY `room_assignments_group_hotel_stay_id_idx` (`group_hotel_stay_id`),
  KEY `room_assignments_group_membership_id_idx` (`group_membership_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `room_assignment_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_assignment_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `room_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `room_types` (
  `id` char(26) NOT NULL,
  `type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_types_type_code_unique` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seasons` (
  `id` char(26) NOT NULL,
  `season_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seasons_season_code_unique` (`season_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transport_segments` (
  `id` char(26) NOT NULL,
  `transport_segment_number` varchar(30) NOT NULL,
  `travel_group_id` char(26) NOT NULL,
  `vendor_id` char(26) DEFAULT NULL,
  `transport_type` enum('BUS','COASTER','VAN','SEDAN','SUV','OTHER') DEFAULT NULL,
  `segment_order` int(11) NOT NULL,
  `origin_location` varchar(255) NOT NULL,
  `destination_location` varchar(255) NOT NULL,
  `origin_type` enum('AIRPORT','HOTEL','RELIGIOUS_SITE','OTHER') DEFAULT NULL,
  `destination_type` enum('AIRPORT','HOTEL','RELIGIOUS_SITE','OTHER') DEFAULT NULL,
  `departure_datetime` datetime DEFAULT NULL,
  `arrival_datetime` datetime DEFAULT NULL,
  `vehicle_identifier` varchar(100) DEFAULT NULL,
  `driver_name` varchar(255) DEFAULT NULL,
  `driver_phone_number` varchar(30) DEFAULT NULL,
  `transport_segment_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `transport_cost` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transport_segments_transport_segment_number_unique` (`transport_segment_number`),
  UNIQUE KEY `transport_segments_travel_group_order_unique` (`travel_group_id`,`segment_order`),
  KEY `transport_segments_travel_group_id_idx` (`travel_group_id`),
  KEY `transport_segments_vendor_id_idx` (`vendor_id`),
  KEY `transport_segments_departure_datetime_idx` (`departure_datetime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transport_segment_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transport_segment_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `travellers` (
  `id` char(26) NOT NULL,
  `traveller_number` varchar(30) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `gender` enum('Female','Male') NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone_number` varchar(30) NOT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `passport_number` varchar(50) DEFAULT NULL,
  `fayda_number` varchar(50) DEFAULT NULL,
  `country_id` char(26) NOT NULL,
  `region_id` char(26) DEFAULT NULL,
  `preferred_language_id` char(26) DEFAULT NULL,
  `traveller_source_id` char(26) DEFAULT NULL,
  `traveller_status_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travellers_traveller_number_unique` (`traveller_number`),
  UNIQUE KEY `travellers_passport_number_unique` (`passport_number`),
  UNIQUE KEY `travellers_fayda_number_unique` (`fayda_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `traveller_contacts` (
  `id` char(26) NOT NULL,
  `traveller_id` char(26) NOT NULL,
  `contact_person_id` char(26) NOT NULL,
  `relationship_type_id` char(26) NOT NULL,
  `is_emergency_contact` tinyint(1) NOT NULL DEFAULT 0,
  `is_primary_contact` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `traveller_contact_status_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `traveller_contacts_traveller_contact_priority_unique` (`traveller_id`,`contact_person_id`,`priority`),
  UNIQUE KEY `traveller_contacts_traveller_priority_unique` (`traveller_id`,`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `traveller_contact_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `traveller_contact_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `traveller_sources` (
  `id` char(26) NOT NULL,
  `source_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `traveller_sources_source_code_unique` (`source_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `traveller_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `traveller_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `travel_groups` (
  `id` char(26) NOT NULL,
  `group_number` varchar(30) NOT NULL,
  `package_version_id` char(26) NOT NULL,
  `name` varchar(150) NOT NULL,
  `departure_date` date DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `maximum_capacity` int(11) NOT NULL,
  `travel_group_status_id` char(26) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_groups_group_number_unique` (`group_number`),
  KEY `travel_groups_package_version_id_idx` (`package_version_id`),
  KEY `travel_groups_status_id_idx` (`travel_group_status_id`),
  KEY `travel_groups_departure_date_idx` (`departure_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `travel_group_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `travel_group_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` char(26) NOT NULL,
  `employee_number` varchar(30) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `gender` varchar(10) NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `phone_number` varchar(30) NOT NULL,
  `password_hash` text NOT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 1,
  `is_email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `failed_login_attempts` int(11) NOT NULL DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `user_status_id` char(26) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_employee_number_unique` (`employee_number`),
  UNIQUE KEY `users_email_address_unique` (`email_address`),
  UNIQUE KEY `users_phone_number_unique` (`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `id` char(26) NOT NULL,
  `user_id` char(26) NOT NULL,
  `role_id` char(26) NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_roles_user_id_role_id_unique` (`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vendors` (
  `id` char(26) NOT NULL,
  `vendor_number` varchar(30) NOT NULL,
  `name` varchar(255) NOT NULL,
  `vendor_type_id` char(26) NOT NULL,
  `contact_person_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `alternate_phone_number` varchar(30) DEFAULT NULL,
  `email_address` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `tax_identification_number` varchar(100) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `vendor_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendors_vendor_number_unique` (`vendor_number`),
  KEY `vendors_vendor_status_id_idx` (`vendor_status_id`),
  KEY `vendors_vendor_type_id_idx` (`vendor_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vendor_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vendor_types` (
  `id` char(26) NOT NULL,
  `type_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vendor_types_type_code_unique` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `verification_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visa_applications` (
  `id` char(26) NOT NULL,
  `application_number` varchar(30) NOT NULL,
  `registration_id` char(26) NOT NULL,
  `submission_date` date DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `visa_number` varchar(100) DEFAULT NULL,
  `visa_application_status_id` char(26) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` char(26) DEFAULT NULL,
  `updated_by` char(26) DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  `rejection_date` date DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `cancellation_date` date DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `visa_cost` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visa_applications_application_number_unique` (`application_number`),
  KEY `visa_applications_registration_id_idx` (`registration_id`),
  KEY `visa_applications_status_id_idx` (`visa_application_status_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visa_application_statuses` (
  `id` char(26) NOT NULL,
  `status_code` varchar(30) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 1,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visa_application_statuses_status_code_unique` (`status_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

