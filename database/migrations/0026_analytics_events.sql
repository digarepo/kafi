-- Analytics events — first-party business events owned by Kafi.
-- Stores only events that Kafi may need to query alongside business data
-- (shares, CTA clicks, conversions). Pageviews/visitors/sessions are handled
-- by Plausible and are NOT duplicated here.
--
-- Privacy:
--   - No raw IP addresses are persisted.
--   - No PII (names, emails, phone numbers) is stored in `payload`.
--   - `anonymous_visitor_id` is a cryptographically random opaque identifier
--     with no PII and no fingerprinting derivation.
--   - `payload` is a small validated JSON object, never an arbitrary dump.

CREATE TABLE `analytics_events` (
	`id` char(26) NOT NULL,
	`event_name` varchar(50) NOT NULL,
	`event_type` enum('custom','conversion') NOT NULL DEFAULT 'custom',
	`anonymous_visitor_id` varchar(36),
	`page_path` varchar(500),
	`referrer` varchar(500),
	`utm_source` varchar(150),
	`utm_medium` varchar(150),
	`utm_campaign` varchar(150),
	`utm_content` varchar(150),
	`utm_term` varchar(150),
	`payload` json,
	`inquiry_id` varchar(26),
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `analytics_events_name_type_created_idx` ON `analytics_events` (`event_name`, `event_type`, `created_at`);
--> statement-breakpoint
CREATE INDEX `analytics_events_visitor_id_idx` ON `analytics_events` (`anonymous_visitor_id`);
--> statement-breakpoint
CREATE INDEX `analytics_events_inquiry_id_idx` ON `analytics_events` (`inquiry_id`);
--> statement-breakpoint
CREATE INDEX `analytics_events_utm_source_created_idx` ON `analytics_events` (`utm_source`, `created_at`);
