-- Credit exception request statuses: PENDING, APPROVED, REJECTED
CREATE TABLE `credit_exception_request_statuses` (
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
	CONSTRAINT `credit_exception_request_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_exception_request_statuses_status_code_unique` UNIQUE(`status_code`)
);

--> statement-breakpoint

-- Credit exception requests: agent/manager requests for admin credit authorization
CREATE TABLE `credit_exception_requests` (
	`id` char(26) NOT NULL,
	`request_number` varchar(30) NOT NULL,
	`registration_id` char(26) NOT NULL,
	`requested_amount` decimal(18, 2) NOT NULL,
	`reason` text NOT NULL,
	`requested_due_date` datetime,
	`requested_by` char(26) NOT NULL,
	`credit_exception_request_status_id` char(26) NOT NULL,
	`active_request_lock` char(26),
	`reviewed_by` char(26),
	`reviewed_at` datetime,
	`rejection_reason` text,
	`finance_exception_id` char(26),
	`notes` text,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`is_deleted` boolean NOT NULL DEFAULT false,
	`deleted_at` datetime,
	`created_by` char(26),
	`updated_by` char(26),
	CONSTRAINT `credit_exception_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_exception_requests_request_number_unique` UNIQUE(`request_number`)
);

--> statement-breakpoint

CREATE INDEX `credit_exception_requests_registration_id_idx` ON `credit_exception_requests` (`registration_id`);
--> statement-breakpoint
CREATE INDEX `credit_exception_requests_status_id_idx` ON `credit_exception_requests` (`credit_exception_request_status_id`);
--> statement-breakpoint
CREATE INDEX `credit_exception_requests_requested_by_idx` ON `credit_exception_requests` (`requested_by`);
--> statement-breakpoint
CREATE UNIQUE INDEX `credit_exception_requests_active_per_registration_unique` ON `credit_exception_requests` (`registration_id`, `active_request_lock`);
