-- Canonical v1.7 Container Visit schema.
-- Preserve existing lifecycle/event data while removing denormalized hold/location fields.

ALTER TABLE `container_event`
  ADD COLUMN `from_state` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'GATE_PASS_ISSUED', 'EXITED', 'CANCELLED') NULL,
  ADD COLUMN `to_state` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'GATE_PASS_ISSUED', 'EXITED', 'CANCELLED') NULL;

UPDATE `container_event`
SET
  `from_state` = CASE `from_status`
    WHEN 'PENDING' THEN 'PENDING'
    WHEN 'AUTHORIZED' THEN 'AUTHORIZED'
    WHEN 'IN_YARD' THEN 'IN_YARD'
    WHEN 'GATE_PASS_ISSUED' THEN 'GATE_PASS_ISSUED'
    WHEN 'GATE_OUT_CONFIRMED' THEN 'EXITED'
    WHEN 'EXITED' THEN 'EXITED'
    WHEN 'CANCELLED' THEN 'CANCELLED'
    WHEN 'GATE_IN_CONFIRMED' THEN 'IN_YARD'
    WHEN 'STACKED' THEN 'IN_YARD'
    WHEN 'UNDER_CUSTOMS_HOLD' THEN 'IN_YARD'
    WHEN 'CUSTOMS_CLEARED' THEN 'IN_YARD'
    ELSE 'PENDING'
  END,
  `to_state` = CASE `to_status`
    WHEN 'PENDING' THEN 'PENDING'
    WHEN 'AUTHORIZED' THEN 'AUTHORIZED'
    WHEN 'IN_YARD' THEN 'IN_YARD'
    WHEN 'GATE_PASS_ISSUED' THEN 'GATE_PASS_ISSUED'
    WHEN 'GATE_OUT_CONFIRMED' THEN 'EXITED'
    WHEN 'EXITED' THEN 'EXITED'
    WHEN 'CANCELLED' THEN 'CANCELLED'
    WHEN 'GATE_IN_CONFIRMED' THEN 'IN_YARD'
    WHEN 'STACKED' THEN 'IN_YARD'
    WHEN 'UNDER_CUSTOMS_HOLD' THEN 'IN_YARD'
    WHEN 'CUSTOMS_CLEARED' THEN 'IN_YARD'
    ELSE 'PENDING'
  END;

ALTER TABLE `container_event`
  DROP COLUMN `from_status`,
  DROP COLUMN `to_status`;

ALTER TABLE `container_visit`
  ADD COLUMN `state` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'GATE_PASS_ISSUED', 'EXITED', 'CANCELLED') NULL,
  ADD COLUMN `full_empty_status` ENUM('FULL', 'EMPTY', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN `manifest_id` CHAR(36) NULL,
  ADD COLUMN `master_bl_id` CHAR(36) NULL,
  ADD COLUMN `consignee_id` CHAR(36) NULL,
  ADD COLUMN `seal_no` VARCHAR(50) NULL;

UPDATE `container_visit`
SET
  `state` = CASE `status`
    WHEN 'PENDING' THEN 'PENDING'
    WHEN 'AUTHORIZED' THEN 'AUTHORIZED'
    WHEN 'IN_YARD' THEN 'IN_YARD'
    WHEN 'GATE_PASS_ISSUED' THEN 'GATE_PASS_ISSUED'
    WHEN 'GATE_OUT_CONFIRMED' THEN 'EXITED'
    WHEN 'EXITED' THEN 'EXITED'
    WHEN 'CANCELLED' THEN 'CANCELLED'
    WHEN 'GATE_IN_CONFIRMED' THEN 'IN_YARD'
    WHEN 'STACKED' THEN 'IN_YARD'
    WHEN 'UNDER_CUSTOMS_HOLD' THEN 'IN_YARD'
    WHEN 'CUSTOMS_CLEARED' THEN 'IN_YARD'
    WHEN 'IN_TRANSIT' THEN 'AUTHORIZED'
    WHEN 'ARRIVED' THEN 'AUTHORIZED'
    WHEN 'INSPECTED' THEN 'AUTHORIZED'
    WHEN 'GATE_IN_REQUESTED' THEN 'AUTHORIZED'
    ELSE 'PENDING'
  END,
  `seal_no` = `seal_number`;

UPDATE `container_visit` cv
LEFT JOIN `house_bl` hb ON hb.`id` = cv.`house_bl_id`
LEFT JOIN `master_bl` mb ON mb.`id` = hb.`master_bl_id`
SET
  cv.`manifest_id` = mb.`manifest_id`,
  cv.`master_bl_id` = hb.`master_bl_id`,
  cv.`consignee_id` = hb.`consignee_id`;

ALTER TABLE `container_visit`
  MODIFY COLUMN `state` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'GATE_PASS_ISSUED', 'EXITED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

DROP INDEX `container_visit_hold_status_idx` ON `container_visit`;
DROP INDEX `container_visit_icd_id_status_idx` ON `container_visit`;

ALTER TABLE `container_visit`
  DROP COLUMN `current_location`,
  DROP COLUMN `hold_status`,
  DROP COLUMN `seal_number`,
  DROP COLUMN `status`;

CREATE INDEX `container_visit_icd_id_state_idx` ON `container_visit`(`icd_id`, `state`);
CREATE INDEX `container_visit_manifest_id_idx` ON `container_visit`(`manifest_id`);
CREATE INDEX `container_visit_master_bl_id_idx` ON `container_visit`(`master_bl_id`);
CREATE INDEX `container_visit_consignee_id_idx` ON `container_visit`(`consignee_id`);
CREATE INDEX `container_visit_container_id_state_idx` ON `container_visit`(`container_id`, `state`);

ALTER TABLE `container_visit`
  ADD CONSTRAINT `container_visit_manifest_id_fkey`
    FOREIGN KEY (`manifest_id`) REFERENCES `manifest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `container_visit_master_bl_id_fkey`
    FOREIGN KEY (`master_bl_id`) REFERENCES `master_bl`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `container_visit_consignee_id_fkey`
    FOREIGN KEY (`consignee_id`) REFERENCES `consignee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
