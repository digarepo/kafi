CREATE TABLE `currencies` (
	`id` char(26) NOT NULL,
	`currency_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`symbol` varchar(10),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `currencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `currencies_currency_code_unique` UNIQUE(`currency_code`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` char(26) NOT NULL,
	`season_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_season_code_unique` UNIQUE(`season_code`)
);
--> statement-breakpoint
CREATE TABLE `package_categories` (
	`id` char(26) NOT NULL,
	`category_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `package_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_categories_category_code_unique` UNIQUE(`category_code`)
);
--> statement-breakpoint
CREATE TABLE `package_templates` (
	`id` char(26) NOT NULL,
	`package_template_code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`short_name` varchar(50),
	`description` text,
	`pilgrimage_type_id` char(26) NOT NULL,
	`package_category_id` char(26) NOT NULL,
	`default_duration_days` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `package_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_templates_package_template_code_unique` UNIQUE(`package_template_code`)
);
--> statement-breakpoint
CREATE TABLE `package_version_inclusions` (
	`id` char(26) NOT NULL,
	`package_version_id` char(26) NOT NULL,
	`inclusion_text` varchar(255) NOT NULL,
	`display_order` int NOT NULL DEFAULT 1,
	`is_highlighted` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `package_version_inclusions_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_version_inclusions_order_unique` UNIQUE(`package_version_id`,`display_order`)
);
--> statement-breakpoint
CREATE TABLE `package_version_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `package_version_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_version_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `package_versions` (
	`id` char(26) NOT NULL,
	`package_version_code` varchar(30) NOT NULL,
	`package_template_id` char(26) NOT NULL,
	`version_name` varchar(150) NOT NULL,
	`version_number` int NOT NULL,
	`slug` varchar(200) NOT NULL,
	`hero_image_url` varchar(500),
	`sort_order` int NOT NULL DEFAULT 0,
	`season_id` char(26),
	`year` int NOT NULL,
	`departure_date` date,
	`return_date` date,
	`base_price` decimal(18,2) NOT NULL,
	`currency_id` char(26) NOT NULL,
	`max_capacity` int,
	`published_at` datetime,
	`sales_start_date` date,
	`sales_end_date` date,
	`package_version_status_id` char(26) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `package_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `package_versions_package_version_code_unique` UNIQUE(`package_version_code`),
	CONSTRAINT `package_versions_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `package_versions_template_version_number_unique` UNIQUE(`package_template_id`,`version_number`)
);
--> statement-breakpoint
CREATE TABLE `pilgrimage_types` (
	`id` char(26) NOT NULL,
	`pilgrimage_type_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `pilgrimage_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `pilgrimage_types_pilgrimage_type_code_unique` UNIQUE(`pilgrimage_type_code`)
);
