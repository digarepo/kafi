-- Add first_viewed_at to track when staff first opened an inquiry.
-- Used by the admin notification badge to show an "unviewed" count that
-- clears when the inquiry is actually seen, not just when its status changes.

ALTER TABLE `inquiries`
  ADD COLUMN `first_viewed_at` DATETIME NULL AFTER `resolved_at`;
