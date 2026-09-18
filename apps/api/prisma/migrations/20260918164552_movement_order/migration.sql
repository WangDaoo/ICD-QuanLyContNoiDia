-- CreateTable
CREATE TABLE `movement_order` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'AUTHORIZED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `authorized_by` CHAR(36) NULL,
    `authorized_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `movement_order_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `movement_order_status_expires_at_idx`(`status`, `expires_at`),
    INDEX `movement_order_created_by_idx`(`created_by`),
    INDEX `movement_order_authorized_by_idx`(`authorized_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `movement_order` ADD CONSTRAINT `movement_order_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movement_order` ADD CONSTRAINT `movement_order_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movement_order` ADD CONSTRAINT `movement_order_authorized_by_fkey` FOREIGN KEY (`authorized_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
