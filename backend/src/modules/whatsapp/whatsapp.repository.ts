import { db } from "../../config/db.js";

// =============================================================================
// WHATSAPP TEMPLATES REPOSITORY
// =============================================================================

export interface WhatsAppTemplate {
  id: number;
  project_id: number;
  trigger_event: "INITIAL" | "REMINDER_D3" | "REMINDER_D1" | "FOLLOWUP_DAY";
  template_name: string;
  template_body: string;
  language_code: string;
  variables_json: any;
  is_active: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  project_id: number;
  trigger_event: "INITIAL" | "REMINDER_D3" | "REMINDER_D1" | "FOLLOWUP_DAY";
  template_name: string;
  template_body: string;
  language_code: string;
  variables_json: any;
  is_active: number;
  created_by: number;
  updated_by?: number;
}

function serializeVariablesJson(value: any): string {
  if (value === undefined || value === null) return "{}";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? "{}" : trimmed;
  }
  return JSON.stringify(value);
}

/**
 * Create a new WhatsApp template
 */
export async function createTemplate(data: CreateTemplateInput): Promise<number> {
  const [result]: any = await db.query(
    `INSERT INTO whatsapp_templates 
     (project_id, trigger_event, template_name, template_body, language_code, variables_json, is_active, created_by, updated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.project_id,
      data.trigger_event,
      data.template_name,
      data.template_body,
      data.language_code,
      serializeVariablesJson(data.variables_json),
      data.is_active,
      data.created_by,
      data.created_by,
    ]
  );
  return result.insertId;
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: number): Promise<WhatsAppTemplate | null> {
  const [rows]: any = await db.query(
    "SELECT * FROM whatsapp_templates WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

/**
 * Get template by project_id + trigger_event
 */
export async function getTemplateByProjectAndEvent(
  projectId: number,
  triggerEvent: string
): Promise<WhatsAppTemplate | null> {
  const [rows]: any = await db.query(
    "SELECT * FROM whatsapp_templates WHERE project_id = ? AND trigger_event = ? AND is_active = 1",
    [projectId, triggerEvent]
  );
  return rows[0] || null;
}

/**
 * Get all templates for a project
 */
export async function getTemplatesByProject(projectId: number): Promise<WhatsAppTemplate[]> {
  const [rows]: any = await db.query(
    "SELECT * FROM whatsapp_templates WHERE project_id = ? ORDER BY trigger_event, created_at DESC",
    [projectId]
  );
  return rows;
}

/**
 * Get all templates (for admin/supervisor list view)
 */
export async function getAllTemplates(userId?: number, role?: string): Promise<WhatsAppTemplate[]> {
  let query = `
     SELECT t.*, p.name as project_name 
     FROM whatsapp_templates t
     JOIN projects p ON t.project_id = p.id
  `;
  
  const queryParams: any[] = [];

  // Filter out templates so supervisors only see their own projects
  if (role === 'SUPERVISOR' && userId) {
    query += ` WHERE p.created_by = ?`;
    queryParams.push(userId);
  }

  query += ` ORDER BY p.name, t.trigger_event, t.created_at DESC`;

  const [rows]: any = await db.query(query, queryParams);
  return rows;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: number,
  data: Partial<CreateTemplateInput>
): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.template_name !== undefined) {
    fields.push("template_name = ?");
    values.push(data.template_name);
  }
  if (data.template_body !== undefined) {
    fields.push("template_body = ?");
    values.push(data.template_body);
  }
  if (data.variables_json !== undefined) {
    fields.push("variables_json = ?");
    values.push(serializeVariablesJson(data.variables_json));
  }
  if (data.is_active !== undefined) {
    fields.push("is_active = ?");
    values.push(data.is_active);
  }
  if (data.updated_by !== undefined) {
    fields.push("updated_by = ?");
    values.push(data.updated_by);
  }

  if (fields.length === 0) return true;

  fields.push("updated_at = NOW()");
  values.push(id);

  const [result]: any = await db.query(
    `UPDATE whatsapp_templates SET ${fields.join(", ")} WHERE id = ?`,
    values
  );
  return result.affectedRows > 0;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: number): Promise<boolean> {
  const [result]: any = await db.query(
    "DELETE FROM whatsapp_templates WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

// =============================================================================
// WHATSAPP MESSAGE LOGS REPOSITORY
// =============================================================================

export interface WhatsAppMessageLog {
  id: number;
  agent_id: number;
  customer_id: number;
  project_id: number;
  template_id: number;
  trigger_event: string;
  send_mode: "MANUAL" | "AUTOMATIC";
  delivery_mode: "WHATSAPP_WEB" | "WHATSAPP_API" | "WA_LINK";
  recipient_phone: string;
  message_preview: string;
  status: "DRAFTED" | "SENT" | "DELIVERED" | "FAILED" | "MANUAL_TRIGGERED";
  created_at: string;
  updated_at: string;
}

export interface CreateMessageLogInput {
  agent_id: number;
  customer_id: number;
  project_id: number;
  template_id: number;
  trigger_event: string;
  send_mode: "MANUAL" | "AUTOMATIC";
  delivery_mode: "WHATSAPP_WEB" | "WHATSAPP_API" | "WA_LINK";
  recipient_phone: string;
  message_preview: string;
  status: "DRAFTED" | "SENT" | "DELIVERED" | "FAILED" | "MANUAL_TRIGGERED";
}

/**
 * Create a new message log
 */
export async function createMessageLog(data: CreateMessageLogInput): Promise<number> {
  const [result]: any = await db.query(
    `INSERT INTO whatsapp_message_logs 
     (agent_id, customer_id, project_id, template_id, trigger_event, send_mode, delivery_mode, recipient_phone, message_preview, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.agent_id,
      data.customer_id,
      data.project_id,
      data.template_id,
      data.trigger_event,
      data.send_mode,
      data.delivery_mode,
      data.recipient_phone,
      data.message_preview,
      data.status,
    ]
  );
  return result.insertId;
}

/**
 * Get message logs for a customer
 */
export async function getMessageLogsByCustomer(customerId: number): Promise<WhatsAppMessageLog[]> {
  const [rows]: any = await db.query(
    `SELECT * FROM whatsapp_message_logs 
     WHERE customer_id = ? 
     ORDER BY created_at DESC`,
    [customerId]
  );
  return rows;
}

/**
 * Get message logs for an agent
 */
export async function getMessageLogsByAgent(agentId: number): Promise<WhatsAppMessageLog[]> {
  const [rows]: any = await db.query(
    `SELECT * FROM whatsapp_message_logs 
     WHERE agent_id = ? 
     ORDER BY created_at DESC`,
    [agentId]
  );
  return rows;
}

/**
 * Get message logs by project
 */
export async function getMessageLogsByProject(projectId: number): Promise<WhatsAppMessageLog[]> {
  const [rows]: any = await db.query(
    `SELECT * FROM whatsapp_message_logs 
     WHERE project_id = ? 
     ORDER BY created_at DESC`,
    [projectId]
  );
  return rows;
}

/**
 * Update message log status
 */
export async function updateMessageLogStatus(
  id: number,
  status: "DRAFTED" | "SENT" | "DELIVERED" | "FAILED"
): Promise<boolean> {
  const [result]: any = await db.query(
    "UPDATE whatsapp_message_logs SET status = ?, updated_at = NOW() WHERE id = ?",
    [status, id]
  );
  return result.affectedRows > 0;
}