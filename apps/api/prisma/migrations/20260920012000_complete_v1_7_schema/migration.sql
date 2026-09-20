-- AlterTable
ALTER TABLE `container_event` MODIFY `from_status` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'GATE_IN_REQUESTED', 'GATE_IN_CONFIRMED', 'STACKED', 'UNDER_CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'GATE_PASS_ISSUED', 'GATE_OUT_CONFIRMED', 'EXITED', 'CANCELLED') NULL,
    MODIFY `to_status` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'GATE_IN_REQUESTED', 'GATE_IN_CONFIRMED', 'STACKED', 'UNDER_CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'GATE_PASS_ISSUED', 'GATE_OUT_CONFIRMED', 'EXITED', 'CANCELLED') NULL;

-- AlterTable
ALTER TABLE `container_visit` ADD COLUMN `gate_in_at` DATETIME(3) NULL,
    ADD COLUMN `gate_out_at` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING', 'AUTHORIZED', 'IN_YARD', 'IN_TRANSIT', 'ARRIVED', 'INSPECTED', 'GATE_IN_REQUESTED', 'GATE_IN_CONFIRMED', 'STACKED', 'UNDER_CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'GATE_PASS_ISSUED', 'GATE_OUT_CONFIRMED', 'EXITED', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `truck_visit` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `visit_code` VARCHAR(120) NOT NULL,
    `visit_type` ENUM('GATE_IN', 'GATE_OUT') NOT NULL,
    `status` ENUM('SCHEDULED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `appointment_at` DATETIME(3) NULL,
    `arrived_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `vehicle_plate` VARCHAR(50) NOT NULL,
    `trailer_plate` VARCHAR(50) NULL,
    `driver_name` VARCHAR(200) NOT NULL,
    `driver_phone` VARCHAR(50) NULL,
    `transporter_id` CHAR(36) NULL,
    `gate_lane` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `truck_visit_visit_code_key`(`visit_code`),
    INDEX `truck_visit_icd_id_status_appointment_at_idx`(`icd_id`, `status`, `appointment_at`),
    INDEX `truck_visit_transporter_id_idx`(`transporter_id`),
    INDEX `truck_visit_vehicle_plate_idx`(`vehicle_plate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `truck_visit_container` (
    `id` CHAR(36) NOT NULL,
    `truck_visit_id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `sequence_no` INTEGER NULL,

    INDEX `truck_visit_container_container_visit_id_idx`(`container_visit_id`),
    UNIQUE INDEX `truck_visit_container_truck_visit_id_container_visit_id_key`(`truck_visit_id`, `container_visit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `container_reception` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `truck_visit_id` CHAR(36) NULL,
    `actual_seal` VARCHAR(100) NOT NULL,
    `actual_weight` DECIMAL(14, 3) NULL,
    `condition_code` VARCHAR(80) NULL,
    `condition_notes` TEXT NULL,
    `photo_ref` TEXT NULL,
    `received_by` CHAR(36) NOT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `container_reception_container_visit_id_key`(`container_visit_id`),
    INDEX `container_reception_truck_visit_id_idx`(`truck_visit_id`),
    INDEX `container_reception_received_by_idx`(`received_by`),
    INDEX `container_reception_received_at_idx`(`received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yard_block` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `block_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(160) NULL,
    `operational` BOOLEAN NOT NULL DEFAULT true,

    INDEX `yard_block_icd_id_operational_idx`(`icd_id`, `operational`),
    UNIQUE INDEX `yard_block_icd_id_block_code_key`(`icd_id`, `block_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yard_slot` (
    `id` CHAR(36) NOT NULL,
    `yard_block_id` CHAR(36) NOT NULL,
    `row_no` VARCHAR(20) NOT NULL,
    `bay_no` VARCHAR(20) NOT NULL,
    `tier_no` VARCHAR(20) NOT NULL,
    `slot_code` VARCHAR(100) NULL,
    `supported_container_type` VARCHAR(30) NULL,
    `reefer_power` BOOLEAN NOT NULL DEFAULT false,
    `max_weight` DECIMAL(14, 3) NULL,
    `operational` BOOLEAN NOT NULL DEFAULT true,

    INDEX `yard_slot_yard_block_id_operational_idx`(`yard_block_id`, `operational`),
    INDEX `yard_slot_supported_container_type_idx`(`supported_container_type`),
    UNIQUE INDEX `yard_slot_yard_block_id_row_no_bay_no_tier_no_key`(`yard_block_id`, `row_no`, `bay_no`, `tier_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `container_location_log` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `yard_slot_id` CHAR(36) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `assigned_by` CHAR(36) NULL,
    `source` ENUM('MANUAL', 'RULE', 'ML', 'MOVEMENT') NOT NULL DEFAULT 'MANUAL',
    `recommendation_id` CHAR(36) NULL,

    INDEX `container_location_log_container_visit_id_ended_at_idx`(`container_visit_id`, `ended_at`),
    INDEX `container_location_log_yard_slot_id_ended_at_idx`(`yard_slot_id`, `ended_at`),
    INDEX `container_location_log_started_at_idx`(`started_at`),
    INDEX `container_location_log_ended_at_idx`(`ended_at`),
    INDEX `container_location_log_recommendation_id_idx`(`recommendation_id`),
    INDEX `container_location_log_yard_slot_id_started_at_ended_at_idx`(`yard_slot_id`, `started_at`, `ended_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yard_movement` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `from_slot_id` CHAR(36) NOT NULL,
    `to_slot_id` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `reason` VARCHAR(255) NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NOT NULL,
    `completed_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `yard_movement_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `yard_movement_from_slot_id_idx`(`from_slot_id`),
    INDEX `yard_movement_to_slot_id_idx`(`to_slot_id`),
    INDEX `yard_movement_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `container_inspection` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `inspection_type` VARCHAR(80) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `result` ENUM('PASS', 'FAIL', 'HOLD') NULL,
    `notes` TEXT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NOT NULL,
    `completed_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `container_inspection_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `container_inspection_inspection_type_idx`(`inspection_type`),
    INDEX `container_inspection_status_idx`(`status`),
    INDEX `container_inspection_result_idx`(`result`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `in_yard_booking` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `booking_type` ENUM('STRIPPING', 'STUFFING', 'INSPECTION') NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `scheduled_at` DATETIME(3) NOT NULL,
    `started_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `actual_package_count` INTEGER NULL,
    `actual_weight` DECIMAL(14, 3) NULL,
    `condition_notes` TEXT NULL,
    `created_by` CHAR(36) NOT NULL,
    `completed_by` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `in_yard_booking_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `in_yard_booking_booking_type_idx`(`booking_type`),
    INDEX `in_yard_booking_status_idx`(`status`),
    INDEX `in_yard_booking_scheduled_at_idx`(`scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_type` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(255) NULL,
    `unit` VARCHAR(30) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_type_code_key`(`code`),
    INDEX `service_type_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tariff` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
    `effective_from` DATETIME(3) NOT NULL,
    `effective_to` DATETIME(3) NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tariff_icd_id_status_idx`(`icd_id`, `status`),
    INDEX `tariff_effective_from_effective_to_idx`(`effective_from`, `effective_to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tariff_rule` (
    `id` CHAR(36) NOT NULL,
    `tariff_id` CHAR(36) NOT NULL,
    `service_type_id` CHAR(36) NOT NULL,
    `container_size` ENUM('SIZE_20', 'SIZE_40', 'SIZE_45') NULL,
    `container_type` ENUM('DRY', 'REEFER', 'FLATRACK', 'OPENTOP', 'TANK') NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tariff_rule_tariff_id_idx`(`tariff_id`),
    INDEX `tariff_rule_service_type_id_idx`(`service_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `order_number` VARCHAR(50) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `consignee_id` CHAR(36) NOT NULL,
    `tariff_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'INVOICED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `subtotal_amount` DECIMAL(14, 2) NOT NULL,
    `vat_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.10,
    `vat_amount` DECIMAL(14, 2) NOT NULL,
    `total_amount` DECIMAL(14, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `as_of_date` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `created_by` CHAR(36) NOT NULL,
    `confirmed_by` CHAR(36) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `cancelled_by` CHAR(36) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancel_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_order_order_number_key`(`order_number`),
    INDEX `service_order_icd_id_status_idx`(`icd_id`, `status`),
    INDEX `service_order_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `service_order_consignee_id_idx`(`consignee_id`),
    INDEX `service_order_tariff_id_idx`(`tariff_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_order_item` (
    `id` CHAR(36) NOT NULL,
    `service_order_id` CHAR(36) NOT NULL,
    `service_type_id` CHAR(36) NOT NULL,
    `tariff_rule_id` CHAR(36) NULL,
    `source_type` VARCHAR(50) NOT NULL,
    `source_id` CHAR(36) NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `unit_price` DECIMAL(14, 2) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_order_item_service_order_id_idx`(`service_order_id`),
    INDEX `service_order_item_service_type_id_idx`(`service_type_id`),
    INDEX `service_order_item_tariff_rule_id_idx`(`tariff_rule_id`),
    INDEX `service_order_item_source_type_source_id_idx`(`source_type`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice` (
    `id` CHAR(36) NOT NULL,
    `service_order_id` CHAR(36) NOT NULL,
    `invoice_no` VARCHAR(120) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_at` DATETIME(3) NULL,
    `total_amount` DECIMAL(18, 2) NOT NULL,
    `paid_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID') NOT NULL DEFAULT 'UNPAID',

    UNIQUE INDEX `invoice_service_order_id_key`(`service_order_id`),
    UNIQUE INDEX `invoice_invoice_no_key`(`invoice_no`),
    INDEX `invoice_status_due_at_idx`(`status`, `due_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment` (
    `id` CHAR(36) NOT NULL,
    `consignee_id` CHAR(36) NOT NULL,
    `payment_ref` VARCHAR(120) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `method` ENUM('CASH', 'BANK_TRANSFER') NOT NULL,
    `paid_at` DATETIME(3) NOT NULL,
    `recorded_by` CHAR(36) NOT NULL,

    UNIQUE INDEX `payment_payment_ref_key`(`payment_ref`),
    INDEX `payment_consignee_id_paid_at_idx`(`consignee_id`, `paid_at`),
    INDEX `payment_paid_at_idx`(`paid_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_allocation` (
    `id` CHAR(36) NOT NULL,
    `payment_id` CHAR(36) NOT NULL,
    `invoice_id` CHAR(36) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_allocation_invoice_id_idx`(`invoice_id`),
    UNIQUE INDEX `payment_allocation_payment_id_invoice_id_key`(`payment_id`, `invoice_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operational_hold` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `hold_type` ENUM('CUSTOMS', 'SHIPPING_LINE', 'DAMAGE', 'SECURITY', 'DOCUMENT', 'OTHER') NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED') NOT NULL DEFAULT 'ACTIVE',
    `reason` TEXT NOT NULL,
    `placed_by` CHAR(36) NULL,
    `placed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `released_by` CHAR(36) NULL,
    `released_at` DATETIME(3) NULL,
    `release_reason` TEXT NULL,

    INDEX `operational_hold_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `operational_hold_hold_type_status_idx`(`hold_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gate_pass` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `qr_token_hash` CHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'USED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `issued_by` CHAR(36) NOT NULL,
    `issued_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `vehicle_plate` VARCHAR(50) NULL,
    `receiver_name` VARCHAR(200) NULL,
    `receiver_id_number` VARCHAR(100) NULL,

    UNIQUE INDEX `gate_pass_code_key`(`code`),
    UNIQUE INDEX `gate_pass_qr_token_hash_key`(`qr_token_hash`),
    INDEX `gate_pass_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `gate_pass_expires_at_status_idx`(`expires_at`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `actor_user_id` CHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity_type` VARCHAR(80) NOT NULL,
    `entity_id` VARCHAR(120) NOT NULL,
    `old_data_json` JSON NULL,
    `new_data_json` JSON NULL,
    `reason` TEXT NULL,
    `request_id` VARCHAR(128) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_icd_id_created_at_idx`(`icd_id`, `created_at`),
    INDEX `audit_log_actor_user_id_created_at_idx`(`actor_user_id`, `created_at`),
    INDEX `audit_log_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_log_action_created_at_idx`(`action`, `created_at`),
    INDEX `audit_log_request_id_idx`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edi_route` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `shipping_line_id` CHAR(36) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `transport` ENUM('MOCK', 'HTTPS', 'SFTP') NOT NULL,
    `outbound_format` ENUM('CODECO_CANONICAL_JSON_V1') NOT NULL DEFAULT 'CODECO_CANONICAL_JSON_V1',
    `partner_target` TEXT NOT NULL,
    `credential_ref` VARCHAR(160) NULL,
    `host_key_sha256` VARCHAR(160) NULL,
    `timeout_ms` INTEGER NOT NULL DEFAULT 10000,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `edi_route_enabled_transport_idx`(`enabled`, `transport`),
    UNIQUE INDEX `edi_route_icd_id_shipping_line_id_key`(`icd_id`, `shipping_line_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edi_outbox_message` (
    `id` CHAR(36) NOT NULL,
    `edi_route_id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NULL,
    `shipping_line_id` CHAR(36) NOT NULL,
    `message_type` ENUM('CODECO_GATE_IN', 'CODECO_GATE_OUT', 'COREOR') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD') NOT NULL DEFAULT 'PENDING',
    `idempotency_key` VARCHAR(200) NOT NULL,
    `payload_snapshot` JSON NOT NULL,
    `routing_snapshot` JSON NOT NULL,
    `request_id` VARCHAR(128) NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `next_retry_at` DATETIME(3) NULL,
    `processing_started_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `external_reference` VARCHAR(255) NULL,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `sent_at` DATETIME(3) NULL,

    UNIQUE INDEX `edi_outbox_message_idempotency_key_key`(`idempotency_key`),
    INDEX `edi_outbox_message_status_next_retry_at_created_at_idx`(`status`, `next_retry_at`, `created_at`),
    INDEX `edi_outbox_message_shipping_line_id_created_at_idx`(`shipping_line_id`, `created_at`),
    INDEX `edi_outbox_message_container_visit_id_created_at_idx`(`container_visit_id`, `created_at`),
    INDEX `edi_outbox_message_processing_started_at_idx`(`processing_started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edi_acknowledgement` (
    `id` CHAR(36) NOT NULL,
    `outbox_message_id` CHAR(36) NULL,
    `shipping_line_id` CHAR(36) NOT NULL,
    `ack_type` ENUM('CONTRL', 'APERAK') NOT NULL,
    `status` ENUM('ACCEPTED', 'REJECTED', 'ERROR', 'UNMATCHED') NOT NULL,
    `external_reference` VARCHAR(255) NULL,
    `raw_payload` LONGTEXT NULL,
    `parsed_payload` JSON NULL,
    `dedupe_key` CHAR(64) NOT NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `edi_acknowledgement_dedupe_key_key`(`dedupe_key`),
    INDEX `edi_acknowledgement_outbox_message_id_received_at_idx`(`outbox_message_id`, `received_at`),
    INDEX `edi_acknowledgement_shipping_line_id_received_at_idx`(`shipping_line_id`, `received_at`),
    INDEX `edi_acknowledgement_status_received_at_idx`(`status`, `received_at`),
    INDEX `edi_acknowledgement_ack_type_received_at_idx`(`ack_type`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `edi_alert` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `source_type` ENUM('OUTBOX', 'ACKNOWLEDGEMENT') NOT NULL,
    `source_id` CHAR(36) NOT NULL,
    `alert_type` ENUM('DELIVERY_FAILURE', 'ACK_REJECTED', 'ACK_ERROR', 'ACK_UNMATCHED') NOT NULL,
    `severity` ENUM('WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `occurrence_count` INTEGER NOT NULL DEFAULT 1,
    `first_occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acknowledged_by` CHAR(36) NULL,
    `acknowledged_at` DATETIME(3) NULL,
    `resolved_by` CHAR(36) NULL,
    `resolved_at` DATETIME(3) NULL,
    `resolution_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `edi_alert_icd_id_status_severity_idx`(`icd_id`, `status`, `severity`),
    INDEX `edi_alert_alert_type_status_idx`(`alert_type`, `status`),
    INDEX `edi_alert_last_occurred_at_idx`(`last_occurred_at`),
    UNIQUE INDEX `edi_alert_source_type_source_id_alert_type_key`(`source_type`, `source_id`, `alert_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yard_recommendation` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `algorithm` ENUM('RULE_BASED_V1', 'ML_RERANK') NOT NULL DEFAULT 'RULE_BASED_V1',
    `model_version` VARCHAR(100) NULL,
    `context_token` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `yard_recommendation_container_visit_id_created_at_idx`(`container_visit_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yard_recommendation_candidate` (
    `id` CHAR(36) NOT NULL,
    `recommendation_id` CHAR(36) NOT NULL,
    `yard_slot_id` CHAR(36) NOT NULL,
    `rule_score` DECIMAL(8, 4) NOT NULL,
    `ml_probability` DECIMAL(8, 4) NULL,
    `rule_rank` INTEGER NOT NULL,
    `ml_rank` INTEGER NULL,
    `selected` BOOLEAN NOT NULL DEFAULT false,
    `selected_at` DATETIME(3) NULL,

    INDEX `yard_recommendation_candidate_yard_slot_id_idx`(`yard_slot_id`),
    INDEX `yard_recommendation_candidate_selected_idx`(`selected`),
    UNIQUE INDEX `yard_recommendation_candidate_recommendation_id_yard_slot_id_key`(`recommendation_id`, `yard_slot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_api_client` (
    `id` CHAR(36) NOT NULL,
    `partner_code` VARCHAR(80) NOT NULL,
    `partner_name` VARCHAR(200) NOT NULL,
    `api_key_hash` CHAR(64) NOT NULL,
    `key_last4` VARCHAR(8) NULL,
    `status` ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `scopes` JSON NOT NULL,
    `last_request_at` DATETIME(3) NULL,
    `created_by` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotated_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `partner_api_client_partner_code_key`(`partner_code`),
    UNIQUE INDEX `partner_api_client_api_key_hash_key`(`api_key_hash`),
    INDEX `partner_api_client_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_warehouse` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `consignee_id` CHAR(36) NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `address` TEXT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `contact_name` VARCHAR(160) NULL,
    `contact_phone` VARCHAR(50) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_warehouse_icd_id_active_idx`(`icd_id`, `active`),
    INDEX `customer_warehouse_consignee_id_idx`(`consignee_id`),
    UNIQUE INDEX `customer_warehouse_icd_id_code_key`(`icd_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transport_handover` (
    `id` CHAR(36) NOT NULL,
    `container_visit_id` CHAR(36) NOT NULL,
    `partner_api_client_id` CHAR(36) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `transport_code` VARCHAR(120) NOT NULL,
    `status` ENUM('DRAFT', 'READY_FOR_HANDOVER', 'PARTNER_ACCEPTED', 'IN_TRANSIT', 'PARTNER_CONFIRMED', 'ICD_CONFIRMED', 'COMPLETED', 'PARTNER_REJECTED', 'DELIVERY_FAILED', 'DISPUTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `expected_delivery_at` DATETIME(3) NULL,
    `ready_at` DATETIME(3) NULL,
    `partner_accepted_at` DATETIME(3) NULL,
    `departed_at` DATETIME(3) NULL,
    `partner_confirmed_at` DATETIME(3) NULL,
    `icd_confirmed_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `icd_confirmed_by` CHAR(36) NULL,
    `created_by` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `transport_handover_container_visit_id_status_idx`(`container_visit_id`, `status`),
    INDEX `transport_handover_partner_api_client_id_status_idx`(`partner_api_client_id`, `status`),
    INDEX `transport_handover_warehouse_id_status_idx`(`warehouse_id`, `status`),
    INDEX `transport_handover_transport_code_idx`(`transport_code`),
    INDEX `transport_handover_status_ready_at_idx`(`status`, `ready_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transport_confirmation` (
    `id` CHAR(36) NOT NULL,
    `transport_handover_id` CHAR(36) NOT NULL,
    `confirmation_type` ENUM('PARTNER_ACCEPTED', 'IN_TRANSIT', 'WAREHOUSE_RECEIVED', 'DELIVERY_FAILED', 'ICD_CONFIRMED', 'DISPUTE') NOT NULL,
    `partner_request_id` VARCHAR(160) NULL,
    `confirmed_at` DATETIME(3) NOT NULL,
    `receiver_name` VARCHAR(160) NULL,
    `receiver_phone` VARCHAR(50) NULL,
    `condition` VARCHAR(160) NULL,
    `note` TEXT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `accuracy_m` DECIMAL(10, 2) NULL,
    `proof_image_url` TEXT NULL,
    `signature_url` TEXT NULL,
    `payloadSnapshot` JSON NULL,
    `created_by_user_id` CHAR(36) NULL,
    `created_by_partner_client_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transport_confirmation_transport_handover_id_created_at_idx`(`transport_handover_id`, `created_at`),
    INDEX `transport_confirmation_partner_request_id_idx`(`partner_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_api_log` (
    `id` CHAR(36) NOT NULL,
    `partner_api_client_id` CHAR(36) NOT NULL,
    `transport_handover_id` CHAR(36) NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `method` VARCHAR(16) NOT NULL,
    `idempotency_key` VARCHAR(200) NULL,
    `request_hash` CHAR(64) NULL,
    `request_body_redacted` JSON NULL,
    `response_body_redacted` JSON NULL,
    `http_status` INTEGER NOT NULL,
    `business_status` VARCHAR(80) NULL,
    `error_code` VARCHAR(120) NULL,
    `request_id` VARCHAR(128) NOT NULL,
    `latency_ms` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `partner_api_log_partner_api_client_id_created_at_idx`(`partner_api_client_id`, `created_at`),
    INDEX `partner_api_log_transport_handover_id_created_at_idx`(`transport_handover_id`, `created_at`),
    INDEX `partner_api_log_request_id_idx`(`request_id`),
    INDEX `partner_api_log_http_status_created_at_idx`(`http_status`, `created_at`),
    UNIQUE INDEX `partner_api_log_partner_api_client_id_endpoint_idempotency_k_key`(`partner_api_client_id`, `endpoint`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` CHAR(36) NOT NULL,
    `icd_id` CHAR(36) NOT NULL,
    `recipient_user_id` CHAR(36) NULL,
    `recipient_email` VARCHAR(255) NULL,
    `type` ENUM('INVOICE_EMAIL', 'GATE_OUT_COMPLETED', 'GATE_PASS_EXPIRING', 'FREE_STORAGE_EXPIRING', 'INSPECTION_HOLD', 'WORK_QUEUE_GATE_IN') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `deep_link` VARCHAR(500) NULL,
    `source_type` VARCHAR(80) NOT NULL,
    `source_id` VARCHAR(120) NOT NULL,
    `dedupe_key` VARCHAR(240) NOT NULL,
    `data_json` JSON NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `notification_dedupe_key_key`(`dedupe_key`),
    INDEX `notification_recipient_user_id_created_at_idx`(`recipient_user_id`, `created_at`),
    INDEX `notification_recipient_user_id_read_at_idx`(`recipient_user_id`, `read_at`),
    INDEX `notification_icd_id_type_created_at_idx`(`icd_id`, `type`, `created_at`),
    INDEX `notification_source_type_source_id_idx`(`source_type`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_device` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `platform` ENUM('ANDROID', 'IOS') NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `token_ciphertext` TEXT NOT NULL,
    `token_iv` VARCHAR(64) NOT NULL,
    `token_auth_tag` VARCHAR(64) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_device_token_hash_key`(`token_hash`),
    INDEX `notification_device_user_id_active_idx`(`user_id`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_delivery` (
    `id` CHAR(36) NOT NULL,
    `notification_id` CHAR(36) NOT NULL,
    `device_id` CHAR(36) NULL,
    `channel` ENUM('EMAIL', 'PUSH') NOT NULL,
    `provider` ENUM('SMTP', 'FCM', 'APNS') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD') NOT NULL DEFAULT 'PENDING',
    `delivery_key` VARCHAR(240) NOT NULL,
    `retry_count` INTEGER NOT NULL DEFAULT 0,
    `next_retry_at` DATETIME(3) NULL,
    `processing_started_at` DATETIME(3) NULL,
    `last_attempt_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `provider_message_id` VARCHAR(255) NULL,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_delivery_delivery_key_key`(`delivery_key`),
    INDEX `notification_delivery_status_next_retry_at_created_at_idx`(`status`, `next_retry_at`, `created_at`),
    INDEX `notification_delivery_notification_id_idx`(`notification_id`),
    INDEX `notification_delivery_device_id_idx`(`device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `container_visit_icd_id_gate_in_at_idx` ON `container_visit`(`icd_id`, `gate_in_at`);

-- CreateIndex
CREATE INDEX `container_visit_icd_id_gate_out_at_idx` ON `container_visit`(`icd_id`, `gate_out_at`);

-- AddForeignKey
ALTER TABLE `truck_visit` ADD CONSTRAINT `truck_visit_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `truck_visit` ADD CONSTRAINT `truck_visit_transporter_id_fkey` FOREIGN KEY (`transporter_id`) REFERENCES `transporter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `truck_visit_container` ADD CONSTRAINT `truck_visit_container_truck_visit_id_fkey` FOREIGN KEY (`truck_visit_id`) REFERENCES `truck_visit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `truck_visit_container` ADD CONSTRAINT `truck_visit_container_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_reception` ADD CONSTRAINT `container_reception_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_reception` ADD CONSTRAINT `container_reception_truck_visit_id_fkey` FOREIGN KEY (`truck_visit_id`) REFERENCES `truck_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_reception` ADD CONSTRAINT `container_reception_received_by_fkey` FOREIGN KEY (`received_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_block` ADD CONSTRAINT `yard_block_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_slot` ADD CONSTRAINT `yard_slot_yard_block_id_fkey` FOREIGN KEY (`yard_block_id`) REFERENCES `yard_block`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_location_log` ADD CONSTRAINT `container_location_log_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_location_log` ADD CONSTRAINT `container_location_log_yard_slot_id_fkey` FOREIGN KEY (`yard_slot_id`) REFERENCES `yard_slot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_location_log` ADD CONSTRAINT `container_location_log_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_location_log` ADD CONSTRAINT `container_location_log_recommendation_id_fkey` FOREIGN KEY (`recommendation_id`) REFERENCES `yard_recommendation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_movement` ADD CONSTRAINT `yard_movement_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_movement` ADD CONSTRAINT `yard_movement_from_slot_id_fkey` FOREIGN KEY (`from_slot_id`) REFERENCES `yard_slot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_movement` ADD CONSTRAINT `yard_movement_to_slot_id_fkey` FOREIGN KEY (`to_slot_id`) REFERENCES `yard_slot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_movement` ADD CONSTRAINT `yard_movement_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_movement` ADD CONSTRAINT `yard_movement_completed_by_fkey` FOREIGN KEY (`completed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_inspection` ADD CONSTRAINT `container_inspection_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_inspection` ADD CONSTRAINT `container_inspection_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `container_inspection` ADD CONSTRAINT `container_inspection_completed_by_fkey` FOREIGN KEY (`completed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `in_yard_booking` ADD CONSTRAINT `in_yard_booking_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `in_yard_booking` ADD CONSTRAINT `in_yard_booking_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `in_yard_booking` ADD CONSTRAINT `in_yard_booking_completed_by_fkey` FOREIGN KEY (`completed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tariff` ADD CONSTRAINT `tariff_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tariff` ADD CONSTRAINT `tariff_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tariff_rule` ADD CONSTRAINT `tariff_rule_tariff_id_fkey` FOREIGN KEY (`tariff_id`) REFERENCES `tariff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tariff_rule` ADD CONSTRAINT `tariff_rule_service_type_id_fkey` FOREIGN KEY (`service_type_id`) REFERENCES `service_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_consignee_id_fkey` FOREIGN KEY (`consignee_id`) REFERENCES `consignee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_tariff_id_fkey` FOREIGN KEY (`tariff_id`) REFERENCES `tariff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_confirmed_by_fkey` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order` ADD CONSTRAINT `service_order_cancelled_by_fkey` FOREIGN KEY (`cancelled_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_item` ADD CONSTRAINT `service_order_item_service_order_id_fkey` FOREIGN KEY (`service_order_id`) REFERENCES `service_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_item` ADD CONSTRAINT `service_order_item_service_type_id_fkey` FOREIGN KEY (`service_type_id`) REFERENCES `service_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_order_item` ADD CONSTRAINT `service_order_item_tariff_rule_id_fkey` FOREIGN KEY (`tariff_rule_id`) REFERENCES `tariff_rule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `invoice_service_order_id_fkey` FOREIGN KEY (`service_order_id`) REFERENCES `service_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_consignee_id_fkey` FOREIGN KEY (`consignee_id`) REFERENCES `consignee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `payment_recorded_by_fkey` FOREIGN KEY (`recorded_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_allocation` ADD CONSTRAINT `payment_allocation_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_allocation` ADD CONSTRAINT `payment_allocation_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_hold` ADD CONSTRAINT `operational_hold_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_hold` ADD CONSTRAINT `operational_hold_placed_by_fkey` FOREIGN KEY (`placed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `operational_hold` ADD CONSTRAINT `operational_hold_released_by_fkey` FOREIGN KEY (`released_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gate_pass` ADD CONSTRAINT `gate_pass_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gate_pass` ADD CONSTRAINT `gate_pass_issued_by_fkey` FOREIGN KEY (`issued_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_user_id_fkey` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_route` ADD CONSTRAINT `edi_route_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_route` ADD CONSTRAINT `edi_route_shipping_line_id_fkey` FOREIGN KEY (`shipping_line_id`) REFERENCES `shipping_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_outbox_message` ADD CONSTRAINT `edi_outbox_message_edi_route_id_fkey` FOREIGN KEY (`edi_route_id`) REFERENCES `edi_route`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_outbox_message` ADD CONSTRAINT `edi_outbox_message_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_outbox_message` ADD CONSTRAINT `edi_outbox_message_shipping_line_id_fkey` FOREIGN KEY (`shipping_line_id`) REFERENCES `shipping_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_acknowledgement` ADD CONSTRAINT `edi_acknowledgement_outbox_message_id_fkey` FOREIGN KEY (`outbox_message_id`) REFERENCES `edi_outbox_message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_acknowledgement` ADD CONSTRAINT `edi_acknowledgement_shipping_line_id_fkey` FOREIGN KEY (`shipping_line_id`) REFERENCES `shipping_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_alert` ADD CONSTRAINT `edi_alert_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_alert` ADD CONSTRAINT `edi_alert_acknowledged_by_fkey` FOREIGN KEY (`acknowledged_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `edi_alert` ADD CONSTRAINT `edi_alert_resolved_by_fkey` FOREIGN KEY (`resolved_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_recommendation` ADD CONSTRAINT `yard_recommendation_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_recommendation_candidate` ADD CONSTRAINT `yard_recommendation_candidate_recommendation_id_fkey` FOREIGN KEY (`recommendation_id`) REFERENCES `yard_recommendation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yard_recommendation_candidate` ADD CONSTRAINT `yard_recommendation_candidate_yard_slot_id_fkey` FOREIGN KEY (`yard_slot_id`) REFERENCES `yard_slot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_api_client` ADD CONSTRAINT `partner_api_client_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_warehouse` ADD CONSTRAINT `customer_warehouse_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_warehouse` ADD CONSTRAINT `customer_warehouse_consignee_id_fkey` FOREIGN KEY (`consignee_id`) REFERENCES `consignee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_handover` ADD CONSTRAINT `transport_handover_container_visit_id_fkey` FOREIGN KEY (`container_visit_id`) REFERENCES `container_visit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_handover` ADD CONSTRAINT `transport_handover_partner_api_client_id_fkey` FOREIGN KEY (`partner_api_client_id`) REFERENCES `partner_api_client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_handover` ADD CONSTRAINT `transport_handover_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `customer_warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_handover` ADD CONSTRAINT `transport_handover_icd_confirmed_by_fkey` FOREIGN KEY (`icd_confirmed_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_handover` ADD CONSTRAINT `transport_handover_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_confirmation` ADD CONSTRAINT `transport_confirmation_transport_handover_id_fkey` FOREIGN KEY (`transport_handover_id`) REFERENCES `transport_handover`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_confirmation` ADD CONSTRAINT `transport_confirmation_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_confirmation` ADD CONSTRAINT `transport_confirmation_created_by_partner_client_id_fkey` FOREIGN KEY (`created_by_partner_client_id`) REFERENCES `partner_api_client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_api_log` ADD CONSTRAINT `partner_api_log_partner_api_client_id_fkey` FOREIGN KEY (`partner_api_client_id`) REFERENCES `partner_api_client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_api_log` ADD CONSTRAINT `partner_api_log_transport_handover_id_fkey` FOREIGN KEY (`transport_handover_id`) REFERENCES `transport_handover`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_recipient_user_id_fkey` FOREIGN KEY (`recipient_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_icd_id_fkey` FOREIGN KEY (`icd_id`) REFERENCES `icd_site`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_device` ADD CONSTRAINT `notification_device_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_delivery` ADD CONSTRAINT `notification_delivery_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_delivery` ADD CONSTRAINT `notification_delivery_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `notification_device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
