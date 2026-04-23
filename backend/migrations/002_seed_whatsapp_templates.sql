-- =============================================================================
-- WhatsApp Templates Seed Data - Phase 1
-- =============================================================================
-- This migration adds default WhatsApp templates for all projects
-- Ensures every project has at least one template for each trigger event

-- Insert INITIAL templates for all projects
INSERT INTO whatsapp_templates 
(project_id, trigger_event, template_name, template_body, language_code, variables_json, is_active, created_by, created_at, updated_at)
SELECT 
  id, 
  'INITIAL', 
  'Initial Contact - Welcome',
  'Hi {{customer_name}}!\n\nWelcome to {{project_name}}! 🎉\n\nI am {{agent_name}}, your dedicated real estate consultant. I''m here to help you find the perfect property.\n\nLooking forward to connecting with you soon!\n\nBest regards,\n{{agent_name}}',
  'en',
  '["customer_name", "project_name", "agent_name"]',
  1,
  1,
  NOW(),
  NOW()
FROM projects 
WHERE id NOT IN (
  SELECT DISTINCT project_id FROM whatsapp_templates 
  WHERE trigger_event = 'INITIAL'
);

-- Insert REMINDER_D3 templates for all projects
INSERT INTO whatsapp_templates 
(project_id, trigger_event, template_name, template_body, language_code, variables_json, is_active, created_by, created_at, updated_at)
SELECT 
  id, 
  'REMINDER_D3', 
  'Reminder - Follow Up (Day 3)',
  'Hi {{customer_name}}! 👋\n\nA gentle reminder! We sent you details about {{project_name}} a few days ago.\n\nDo you have any questions about the project or would you like to schedule a visit?\n\nFeel free to reach out. I''m here to help!\n\nBest regards,\n{{agent_name}}\n{{project_name}}',
  'en',
  '["customer_name", "project_name", "agent_name"]',
  1,
  1,
  NOW(),
  NOW()
FROM projects 
WHERE id NOT IN (
  SELECT DISTINCT project_id FROM whatsapp_templates 
  WHERE trigger_event = 'REMINDER_D3'
);

-- Insert REMINDER_D1 templates for all projects
INSERT INTO whatsapp_templates 
(project_id, trigger_event, template_name, template_body, language_code, variables_json, is_active, created_by, created_at, updated_at)
SELECT 
  id, 
  'REMINDER_D1', 
  'Reminder - Tomorrow Follow Up',
  'Hi {{customer_name}}! ⏰\n\nJust a quick reminder that we have a scheduled follow-up with you tomorrow regarding {{project_name}}!\n\nPlease let me know if you need to reschedule.\n\nLooking forward to our conversation!\n\nBest regards,\n{{agent_name}}',
  'en',
  '["customer_name", "project_name", "agent_name"]',
  1,
  1,
  NOW(),
  NOW()
FROM projects 
WHERE id NOT IN (
  SELECT DISTINCT project_id FROM whatsapp_templates 
  WHERE trigger_event = 'REMINDER_D1'
);

-- Insert FOLLOWUP_DAY templates for all projects
INSERT INTO whatsapp_templates 
(project_id, trigger_event, template_name, template_body, language_code, variables_json, is_active, created_by, created_at, updated_at)
SELECT 
  id, 
  'FOLLOWUP_DAY', 
  'Follow Up - Today',
  'Hi {{customer_name}}! 👋\n\nToday is your scheduled follow-up day for {{project_name}}!\n\nI''m available anytime to discuss your interest or answer any questions. You can also visit our website or call me directly.\n\nLooking forward to connecting with you!\n\nBest regards,\n{{agent_name}}\n{{project_name}}',
  'en',
  '["customer_name", "project_name", "agent_name"]',
  1,
  1,
  NOW(),
  NOW()
FROM projects 
WHERE id NOT IN (
  SELECT DISTINCT project_id FROM whatsapp_templates 
  WHERE trigger_event = 'FOLLOWUP_DAY'
);

-- =============================================================================
-- Migration Notes:
-- 
-- 1. This migration populates default WhatsApp templates for each trigger event.
-- 2. One template per project per trigger event is created (respects UNIQUE constraint).
-- 3. Supervisors can customize these templates via the WhatsApp Template Management UI.
-- 4. If templates already exist for a project+event combination, they won't be duplicated.
-- 5. All templates are set to is_active=1 so they are available immediately.
-- 6. created_by=1 assumes user ID 1 exists (typically the admin user).
-- 
-- Template Variables:
-- - {{customer_name}}: Will be replaced with actual customer name
-- - {{agent_name}}: Will be replaced with agent's full name
-- - {{project_name}}: Will be replaced with project name
-- =============================================================================
