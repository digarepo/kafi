CREATE TABLE `auth_audit_logs` (
	`id` char(26) NOT NULL,
	`user_id` char(26),
	`event_type` varchar(50) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(255),
	`success` boolean NOT NULL DEFAULT true,
	`details` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `auth_audit_logs_id` PRIMARY KEY(`id`)
);
