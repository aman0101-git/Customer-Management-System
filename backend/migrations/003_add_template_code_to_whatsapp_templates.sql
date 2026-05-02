-- =============================================================================
-- Add template_code column to whatsapp_templates for Profile-Centric Workflow
-- =============================================================================
-- This migration adds template_code mapping for status-driven template selection
-- Expected codes: D3, D1, TODAY, FU, SDOW, NR, VD, LOST, VM, BD

ALTER TABLE whatsapp_templates ADD COLUMN template_code VARCHAR(20) AFTER trigger_event;

-- Create index for faster lookups by template_code
CREATE INDEX idx_template_code ON whatsapp_templates(project_id, template_code);

-- =============================================================================
-- Migration Notes:
-- 
-- 1. template_code maps statuses to templates for dynamic selection
-- 2. Codes: D3 (Day 3), D1 (Day 1), TODAY (Today), FU (Follow-up), SDOW (Schedule Day of Week)
--    NR (Not Reachable), VD (Visit Done), LOST (Lost), VM (Virtual Meet), BD (Booking Done)
-- 3. This enables the Profile-Centric Workflow where template selection is dynamic
--    based on customer Status and Follow-up Date
-- 4. trigger_event remains for backward compatibility
-- =============================================================================
