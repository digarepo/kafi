CREATE TABLE `cities` (
	`id` char(26) NOT NULL,
	`country_id` char(26) NOT NULL,
	`region_id` char(26),
	`geoname_id` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`population` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`),
	CONSTRAINT `cities_geoname_id_unique` UNIQUE(`geoname_id`)
);
--> statement-breakpoint
CREATE INDEX `cities_country_id_idx` ON `cities` (`country_id`);--> statement-breakpoint
CREATE INDEX `cities_region_id_idx` ON `cities` (`region_id`);