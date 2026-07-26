CREATE TABLE `permissions` (
	`id` char(26) NOT NULL,
	`permission_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`module` varchar(100),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_permission_code_unique` UNIQUE(`permission_code`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` char(26) NOT NULL,
	`role_id` char(26) NOT NULL,
	`permission_id` char(26) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_id_permission_id_unique` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` char(26) NOT NULL,
	`role_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_system_role` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_role_code_unique` UNIQUE(`role_code`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`role_id` char(26) NOT NULL,
	`assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_roles_user_id_role_id_unique` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `user_statuses` (
	`id` char(26) NOT NULL,
	`status_code` varchar(30) NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `user_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_statuses_status_code_unique` UNIQUE(`status_code`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(26) NOT NULL,
	`employee_number` varchar(30) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`gender` varchar(10) NOT NULL,
	`email_address` varchar(255) NOT NULL,
	`phone_number` varchar(30) NOT NULL,
	`password_hash` text NOT NULL,
	`job_title` varchar(100),
	`last_login_at` datetime,
	`password_changed_at` datetime,
	`must_change_password` boolean NOT NULL DEFAULT true,
	`is_email_verified` boolean NOT NULL DEFAULT false,
	`is_phone_verified` boolean NOT NULL DEFAULT false,
	`failed_login_attempts` int NOT NULL DEFAULT 0,
	`locked_until` datetime,
	`user_status_id` char(26) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_by` char(26),
	`updated_by` char(26),
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_employee_number_unique` UNIQUE(`employee_number`),
	CONSTRAINT `users_email_address_unique` UNIQUE(`email_address`),
	CONSTRAINT `users_phone_number_unique` UNIQUE(`phone_number`)
);
