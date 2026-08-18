-- Round 4C: Ground Transport Simplification
-- Make vendor_id and transport_type nullable (optional for MVP)
-- Clean up any soft-deleted transport segments to avoid unique constraint conflicts

ALTER TABLE transport_segments MODIFY COLUMN vendor_id char(26) DEFAULT NULL;
ALTER TABLE transport_segments MODIFY COLUMN transport_type enum('BUS','COASTER','VAN','SEDAN','SUV','OTHER') DEFAULT NULL;

-- Remove soft-deleted rows so the (travel_group_id, segment_order) unique
-- constraint does not block re-creation after deletion.
DELETE FROM transport_segments WHERE is_deleted = 1;
