-- Phase B workflow migration
-- Adds registration cancellation audit columns and the approved Phase B lifecycle status set.

DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS guard_phase_b_migration()
BEGIN
  DECLARE v_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count
  FROM registrations r
  INNER JOIN registration_statuses rs ON rs.id = r.registration_status_id
  WHERE rs.status_code IN ('PENDING_PAYMENT', 'DOCUMENT_PENDING', 'CONFIRMED')
    AND r.is_deleted = FALSE;

  IF v_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Data guard violation: existing registrations use deprecated status codes. Manual remapping required before Phase B migration.';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM travel_groups g
  INNER JOIN travel_group_statuses gs ON gs.id = g.travel_group_status_id
  WHERE gs.status_code IN ('OPEN', 'CLOSED')
    AND g.is_deleted = FALSE;

  IF v_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Data guard violation: existing travel groups use deprecated status codes. Manual remapping required before Phase B migration.';
  END IF;
END$$

DELIMITER ;

CALL guard_phase_b_migration();
DROP PROCEDURE IF EXISTS guard_phase_b_migration;

-- Cancellation audit columns
ALTER TABLE registrations
  ADD COLUMN cancellation_reason TEXT NULL AFTER registration_status_id,
  ADD COLUMN cancelled_at DATETIME NULL AFTER cancellation_reason,
  ADD COLUMN cancelled_by CHAR(26) NULL AFTER cancelled_at,
  ADD CONSTRAINT registrations_cancelled_by_fk FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add PROCESSING to registration_statuses
INSERT INTO registration_statuses (id, status_code, name, display_order, is_active, created_at, updated_at)
SELECT LEFT(REPLACE(UUID(), '-', ''), 26), 'PROCESSING', 'Processing', 2, TRUE, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM registration_statuses WHERE status_code = 'PROCESSING');

UPDATE registration_statuses
SET name = 'Processing', display_order = 2, is_active = TRUE, updated_at = NOW()
WHERE status_code = 'PROCESSING';

-- Add TRAVEL_PREPARED to travel_group_statuses
INSERT INTO travel_group_statuses (id, status_code, name, display_order, is_active, created_at, updated_at)
SELECT LEFT(REPLACE(UUID(), '-', ''), 26), 'TRAVEL_PREPARED', 'Travel Prepared', 2, TRUE, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM travel_group_statuses WHERE status_code = 'TRAVEL_PREPARED');

UPDATE travel_group_statuses
SET name = 'Travel Prepared', display_order = 2, is_active = TRUE, updated_at = NOW()
WHERE status_code = 'TRAVEL_PREPARED';

-- Deactivate deprecated registration status codes
UPDATE registration_statuses
SET is_active = FALSE, updated_at = NOW()
WHERE status_code IN ('PENDING_PAYMENT', 'DOCUMENT_PENDING', 'CONFIRMED');

-- Deactivate deprecated travel group status codes
UPDATE travel_group_statuses
SET is_active = FALSE, updated_at = NOW()
WHERE status_code IN ('OPEN', 'CLOSED');
