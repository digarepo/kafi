-- Add UTM / campaign attribution and anonymous visitor ID to inquiries.
-- These fields are nullable — only present when the visitor arrived via a
-- tracked link. They let staff correlate an inquiry to a marketing campaign
-- and to an anonymous analytics session without storing PII in analytics.

ALTER TABLE `inquiries`
	ADD COLUMN `utm_source` varchar(150),
	ADD COLUMN `utm_medium` varchar(150),
	ADD COLUMN `utm_campaign` varchar(150),
	ADD COLUMN `utm_content` varchar(150),
	ADD COLUMN `utm_term` varchar(150),
	ADD COLUMN `anonymous_visitor_id` varchar(36);
