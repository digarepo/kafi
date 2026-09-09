ALTER TABLE `travel_rounds`
  ADD COLUMN `package_version_id` varchar(26) NULL AFTER `round_number`,
  ADD UNIQUE KEY `travel_rounds_package_version_unique` (`package_version_id`),
  ADD CONSTRAINT `travel_rounds_package_version_id_fk`
    FOREIGN KEY (`package_version_id`) REFERENCES `package_versions`(`id`);
