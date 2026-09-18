-- CreateTable
CREATE TABLE `icd_site` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `icd_site_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    INDEX `user_icd_id_idx`(`icd_id`),
    INDEX `user_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role` (
    `user_id` CHAR(36) NOT NULL,
    `role_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_role_role_id_idx`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permission` (
    `role_id` CHAR(36) NOT NULL,
    `permission_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permission_permission_id_idx`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `icd_setting` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `value_type` VARCHAR(30) NOT NULL,
    `description` VARCHAR(255) NULL,
    `updated_by` CHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `icd_setting_updated_by_idx`(`updated_by`),
    UNIQUE INDEX `icd_setting_icd_id_key_key`(`icd_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role` ADD CONSTRAINT `user_role_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permission` ADD CONSTRAINT `role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `icd_setting` ADD CONSTRAINT `icd_setting_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `icd_setting` ADD CONSTRAINT `icd_setting_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
