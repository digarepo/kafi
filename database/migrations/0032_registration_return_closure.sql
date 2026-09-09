-- Add staff-confirmed return and stay-extension fields to registrations.
ALTER TABLE `registrations`
  ADD COLUMN `return_completion_status` varchar(20) NOT NULL DEFAULT 'OPEN',
  ADD COLUMN `actual_return_date` date NULL,
  ADD COLUMN `amended_return_date` date NULL,
  ADD COLUMN `extension_reason` text NULL,
  ADD COLUMN `amendment_reference` varchar(100) NULL,
  ADD COLUMN `return_completion_notes` text NULL;
