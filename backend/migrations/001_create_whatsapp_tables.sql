-- =============================================================================
-- WhatsApp Messaging System - Phase 1 Database Migration
-- =============================================================================

-- Table: whatsapp_templates
-- Stores WhatsApp message templates project-wise with trigger events
CREATE TABLE IF NOT EXISTS `whatsapp_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL,
  `trigger_event` ENUM('INITIAL', 'REMINDER_D3', 'REMINDER_D1', 'FOLLOWUP_DAY') NOT NULL,
  `template_name` VARCHAR(255) NOT NULL,
  `template_body` LONGTEXT NOT NULL COMMENT 'Message body with {{variable}} placeholders',
  `language_code` VARCHAR(10) DEFAULT 'en',
  `variables_json` JSON DEFAULT '{}' COMMENT 'JSON array of supported variables',
  `is_active` TINYINT DEFAULT 1,
  `created_by` INT NOT NULL,
  `updated_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT `fk_whatsapp_templates_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_whatsapp_templates_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_whatsapp_templates_updater` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`),
  
  -- Indexes
  UNIQUE KEY `uk_project_trigger_event` (`project_id`, `trigger_event`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_trigger_event` (`trigger_event`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: whatsapp_message_logs
-- Audit trail for all WhatsApp messaging actions
CREATE TABLE IF NOT EXISTS `whatsapp_message_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` INT NOT NULL,
  `customer_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `template_id` INT NOT NULL,
  `trigger_event` VARCHAR(50) NOT NULL COMMENT 'INITIAL, REMINDER_D3, REMINDER_D1, FOLLOWUP_DAY',
  `send_mode` ENUM('MANUAL', 'AUTOMATIC') DEFAULT 'MANUAL',
  `delivery_mode` ENUM('WHATSAPP_WEB', 'WHATSAPP_API') DEFAULT 'WHATSAPP_WEB' COMMENT 'How message is sent',
  `recipient_phone` VARCHAR(20) NOT NULL,
  `message_preview` LONGTEXT NOT NULL COMMENT 'Rendered message content',
  `status` ENUM('DRAFTED', 'SENT', 'DELIVERED', 'FAILED') DEFAULT 'DRAFTED',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT `fk_whatsapp_logs_agent` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_whatsapp_logs_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_whatsapp_logs_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_whatsapp_logs_template` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates`(`id`) ON DELETE RESTRICT,
  
  -- Indexes
  KEY `idx_agent_id` (`agent_id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_agent_customer` (`agent_id`, `customer_id`),
  KEY `idx_project_trigger` (`project_id`, `trigger_event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Migration Notes:
-- 
-- 1. Run this migration script on your database before starting the application.
-- 2. The whatsapp_templates table stores project-wise templates with trigger events.
-- 3. The whatsapp_message_logs table provides audit trail for all messaging actions.
-- 4. Both tables are linked to existing projects, users, and customers tables.
-- 5. Unique constraint on (project_id, trigger_event) ensures one template per project per event.
-- 6. Message logs include both manual and automatic sending modes (Phase 2).
-- 7. Delivery modes support WhatsApp Web (Phase 1) and WhatsApp API (Phase 2+).
-- =============================================================================
