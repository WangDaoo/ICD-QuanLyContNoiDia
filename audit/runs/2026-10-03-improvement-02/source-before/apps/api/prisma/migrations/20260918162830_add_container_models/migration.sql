-- CreateTable
CREATE TABLE `container` (
    `id` CHAR(36) NOT NULL,
    `container_number` VARCHAR(11) NOT NULL,
    `iso_code` VARCHAR(10) NOT NULL,
    `size` ENUM('SIZE_20', 'SIZE_40', 'SIZE_45') NOT NULL,
    `type` ENUM('DRY', 'REEFER', 'FLATRACK', 'OPENTOP', 'TANK') NOT NULL,
    `height` DECIMAL(5, 2) NULL,
    `tare_weight` DECIMAL(10, 3) NULL,
    `max_payload` DECIMAL(10, 3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `container_container_number_key`(`container_number`),
    INDEX `container_container_number_idx`(`container_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `container_visit` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `container_id` CHAR(36) NOT NULL,
    `house_bl_id` CHAR(36) NULL,
    `seal_number` VARCHAR(50) NULL,
    `cargo_description` TEXT NULL,
    `gross_weight` DECIMAL(14, 3) NULL,
    `status` ENUM('PENDING', 'AUTHORIZED', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'GATE_IN_REQUESTED', 'GATE_IN_CONFIRMED', 'STACKED', 'UNDER_CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'GATE_PASS_ISSUED', 'GATE_OUT_CONFIRMED', 'EXITED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `category` ENUM('IMPORT', 'EXPORT', 'STORAGE') NOT NULL DEFAULT 'IMPORT',
    `hold_status` ENUM('NONE', 'CUSTOMS_HOLD', 'ICD_HOLD', 'PAYMENT_HOLD') NOT NULL DEFAULT 'NONE',
    `is_overstay` BOOLEAN NOT NULL DEFAULT false,
    `dwell_days` INTEGER NOT NULL DEFAULT 0,
    `current_location` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `container_visit_icd_id_status_idx`(`icd_id`, `status`),
    INDEX `container_visit_container_id_idx`(`container_id`),
    INDEX `container_visit_house_bl_id_idx`(`house_bl_id`),
    INDEX `container_visit_category_idx`(`category`),
    INDEX `container_visit_hold_status_idx`(`hold_status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `container_event` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `from_status` ENUM('PENDING', 'AUTHORIZED', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'GATE_IN_REQUESTED', 'GATE_IN_CONFIRMED', 'STACKED', 'UNDER_CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'GATE_PASS_ISSUED', 'GATE_OUT_CONFIRMED', 'EXITED', 'CANCELLED') NULL,
    `to_status` ENUM('PENDING', 'AUTHORIZED', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'GATE_IN_REQUESTED', 'GATE_IN_CONFIRMED', 'STACKED', 'UNDER_CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'GATE_PASS_ISSUED', 'GATE_OUT_CONFIRMED', 'EXITED', 'CANCELLED') NULL,
    `actor_id` CHAR(36) NULL,
    `metadata` JSON NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `container_event_visit_id_idx`(`visit_id`),
    INDEX `container_event_actor_id_idx`(`actor_id`),
    INDEX `container_event_event_type_idx`(`event_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `container_visit` ADD CONSTRAINT `container_visit_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_visit` ADD CONSTRAINT `container_visit_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_visit` ADD CONSTRAINT `container_visit_house_bl_id_fkey` FOREIGN KEY (`house_bl_id`) REFERENCES `house_bl`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_event` ADD CONSTRAINT `container_event_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `container_visit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_event` ADD CONSTRAINT `container_event_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
