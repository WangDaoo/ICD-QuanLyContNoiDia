-- CreateTable
CREATE TABLE `manifest` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `manifest_no` VARCHAR(50) NOT NULL,
    `shipping_line_id` CHAR(36) NOT NULL,
    `vessel_name` VARCHAR(150) NOT NULL,
    `voyage_no` VARCHAR(100) NOT NULL,
    `eta` DATETIME(3) NOT NULL,
    `port_of_loading` VARCHAR(100) NOT NULL,
    `port_of_discharge` VARCHAR(100) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `manifest_icd_id_status_idx`(`icd_id`, `status`),
    INDEX `manifest_shipping_line_id_idx`(`shipping_line_id`),
    INDEX `manifest_eta_idx`(`eta`),
    UNIQUE INDEX `manifest_icd_id_manifest_no_key`(`icd_id`, `manifest_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `master_bl` (
    `id` CHAR(36) NOT NULL,
    `manifest_id` CHAR(36) NOT NULL,
    `mbl_number` VARCHAR(100) NOT NULL,
    `shipping_line_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `master_bl_shipping_line_id_idx`(`shipping_line_id`),
    UNIQUE INDEX `master_bl_manifest_id_mbl_number_key`(`manifest_id`, `mbl_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `house_bl` (
    `id` CHAR(36) NOT NULL,
    `master_bl_id` CHAR(36) NOT NULL,
    `hbl_number` VARCHAR(100) NOT NULL,
    `consignee_id` CHAR(36) NOT NULL,
    `clearing_agent_id` CHAR(36) NOT NULL,
    `cargo_description` TEXT NOT NULL,
    `gross_weight` DECIMAL(14, 3) NOT NULL,
    `package_count` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `house_bl_consignee_id_idx`(`consignee_id`),
    INDEX `house_bl_clearing_agent_id_idx`(`clearing_agent_id`),
    UNIQUE INDEX `house_bl_master_bl_id_hbl_number_key`(`master_bl_id`, `hbl_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `manifest` ADD CONSTRAINT `manifest_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manifest` ADD CONSTRAINT `manifest_shipping_line_id_fkey` FOREIGN KEY (`shipping_line_id`) REFERENCES `shipping_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manifest` ADD CONSTRAINT `manifest_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_bl` ADD CONSTRAINT `master_bl_manifest_id_fkey` FOREIGN KEY (`manifest_id`) REFERENCES `manifest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `master_bl` ADD CONSTRAINT `master_bl_shipping_line_id_fkey` FOREIGN KEY (`shipping_line_id`) REFERENCES `shipping_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `house_bl` ADD CONSTRAINT `house_bl_master_bl_id_fkey` FOREIGN KEY (`master_bl_id`) REFERENCES `master_bl`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `house_bl` ADD CONSTRAINT `house_bl_consignee_id_fkey` FOREIGN KEY (`consignee_id`) REFERENCES `consignee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `house_bl` ADD CONSTRAINT `house_bl_clearing_agent_id_fkey` FOREIGN KEY (`clearing_agent_id`) REFERENCES `clearing_agent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
