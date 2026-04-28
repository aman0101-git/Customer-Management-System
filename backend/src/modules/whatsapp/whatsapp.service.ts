import * as Repository from "./whatsapp.repository.js";
import { db } from "../../config/db.js";
import type {
  WhatsAppTemplate,
  CreateTemplateInput,
  CreateMessageLogInput,
} from "./whatsapp.repository.js";

// =============================================================================
// HELPERS
// =============================================================================

function normalizeVariablesJson(input: unknown): Record<string, unknown> {
  if (input === undefined || input === null) return {};

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") return {};
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }

  if (typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  return {};
}

// =============================================================================
// TEMPLATE SERVICE
// =============================================================================

/**
 * Fetch template by project_id + trigger_event
 * Returns null if no active template found
 */
export async function getTemplateForEvent(
  projectId: number,
  triggerEvent: string
): Promise<WhatsAppTemplate | null> {
  const template = await Repository.getTemplateByProjectAndEvent(projectId, triggerEvent);
  if (!template) {
    throw new Error(`No template found for project ${projectId} and event ${triggerEvent}`);
  }
  return template;
}

/**
 * Create a new template (Supervisor)
 */
export async function createTemplate(data: CreateTemplateInput): Promise<number> {
  // Validate required fields
  if (!data.project_id || !data.trigger_event || !data.template_body || !data.template_name) {
    throw new Error("Missing required fields: project_id, trigger_event, template_body, template_name");
  }

  // Validate trigger_event
  const validEvents = ["INITIAL", "REMINDER_D3", "REMINDER_D1", "FOLLOWUP_DAY"];
  if (!validEvents.includes(data.trigger_event)) {
    throw new Error(`Invalid trigger_event. Must be one of: ${validEvents.join(", ")}`);
  }

  // Normalize variables_json
  const variablesJson = normalizeVariablesJson(data.variables_json);

  const templateId = await Repository.createTemplate({
    ...data,
    variables_json: variablesJson,
  });

  return templateId;
}

/**
 * Update a template (Supervisor)
 */
export async function updateTemplate(
  templateId: number,
  data: Partial<CreateTemplateInput>
): Promise<void> {
  const existing = await Repository.getTemplateById(templateId);
  if (!existing) {
    throw new Error(`Template with ID ${templateId} not found`);
  }

  // Normalize variables_json if provided
  let normalizedData: Partial<CreateTemplateInput> = { ...data };

  if (data.variables_json !== undefined) {
    normalizedData.variables_json = normalizeVariablesJson(data.variables_json);
  }

  const updated = await Repository.updateTemplate(templateId, normalizedData);
  if (!updated) {
    throw new Error("Failed to update template");
  }
}

/**
 * List all templates for a project (Supervisor)
 */
export async function listTemplatesByProject(projectId: number): Promise<WhatsAppTemplate[]> {
  const templates = await Repository.getTemplatesByProject(projectId);
  return templates;
}

/**
 * List all templates globally (Supervisor)
 */
export async function listAllTemplates(userId?: number, role?: string): Promise<any[]> {
  const templates = await Repository.getAllTemplates(userId, role);
  return templates.map(template => ({
    ...template,
    variables_json: normalizeVariablesJson(template.variables_json),
  }));
}

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: number): Promise<WhatsAppTemplate | null> {
  const template = await Repository.getTemplateById(templateId);
  return template;
}

/**
 * Delete a template (Supervisor)
 */
export async function deleteTemplate(templateId: number): Promise<void> {
  const existing = await Repository.getTemplateById(templateId);
  if (!existing) {
    throw new Error(`Template with ID ${templateId} not found`);
  }

  const deleted = await Repository.deleteTemplate(templateId);
  if (!deleted) {
    throw new Error("Failed to delete template");
  }
}

// =============================================================================
// MESSAGE RENDERING SERVICE
// =============================================================================

export interface TemplateVariables {
  customer_name: string;
  agent_name: string;
  project_name: string;
  follow_up_date?: string; 
  follow_up_time?: string;
}

/**
 * Render template body with actual variables
 * Replaces {{variable_name}} with actual values
 */
export function renderTemplateBody(
  templateBody: string,
  variables: TemplateVariables
): string {
  let rendered = templateBody;

  // Replace all template variables
  rendered = rendered.replace(/{{customer_name}}/g, variables.customer_name || "");
  rendered = rendered.replace(/{{agent_name}}/g, variables.agent_name || "");
  rendered = rendered.replace(/{{project_name}}/g, variables.project_name || "");
  rendered = rendered.replace(/{{follow_up_date}}/g, variables.follow_up_date || "");
  rendered = rendered.replace(/{{follow_up_time}}/g, variables.follow_up_time || "");

  return rendered;
}

/**
 * Extract template variables from template body
 * Returns array of variable names found in template
 */
export function extractTemplateVariables(templateBody: string): string[] {
  const regex = /{{(\w+)}}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(templateBody)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)];
}

// =============================================================================
// MESSAGE LOGGING SERVICE
// =============================================================================

/**
 * Log a message action
 */
export async function logMessage(data: CreateMessageLogInput): Promise<number> {
  // Validate required fields
  if (!data.agent_id || !data.customer_id || !data.project_id || !data.template_id || !data.recipient_phone) {
    throw new Error("Missing required fields for message logging");
  }

  const logId = await Repository.createMessageLog(data);
  return logId;
}

/**
 * Get message history for a customer
 */
export async function getCustomerMessageHistory(customerId: number): Promise<any[]> {
  const logs = await Repository.getMessageLogsByCustomer(customerId);
  return logs;
}

/**
 * Get message history for an agent
 */
export async function getAgentMessageHistory(agentId: number): Promise<any[]> {
  const logs = await Repository.getMessageLogsByAgent(agentId);
  return logs;
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  logId: number,
  status: "DRAFTED" | "SENT" | "DELIVERED" | "FAILED"
): Promise<void> {
  const updated = await Repository.updateMessageLogStatus(logId, status);
  if (!updated) {
    throw new Error(`Failed to update message log ${logId}`);
  }
}

// =============================================================================
// MANUAL WHATSAPP SENDING SERVICE (Phase 2)
// =============================================================================

/**
 * Validate phone number format
 * Phone must be at least 10 digits
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 10;
}

/**
 * Check if rendered message has any remaining placeholders
 * Returns true if message is valid (no {{}} remaining)
 */
export function validateRenderedMessage(renderedMessage: string): boolean {
  const placeholderRegex = /{{(\w+)}}/g;
  return !placeholderRegex.test(renderedMessage);
}

/**
 * Generate WhatsApp wa.me link
 * Format: https://wa.me/{phone}?text={encoded_message}
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const digitsOnly = phone.replace(/\D/g, "");

  let formattedPhone = digitsOnly;
  if (!digitsOnly.startsWith("91") && digitsOnly.length === 10) {
    formattedPhone = "91" + digitsOnly;
  }

  const encodedMessage = encodeURIComponent(message);

  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
}

/**
 * Mark reminder as sent in agent_customers table
 * OPTIMISTIC TRACKING: Called when link is generated, before user actually sends
 */
export async function markReminderAsSent(
  agentId: number,
  customerId: number,
  triggerEvent: string
): Promise<void> {
  let updateField = "";
  
  switch (triggerEvent) {
    case "REMINDER_D3":
      updateField = "d3_sent";
      break;
    case "REMINDER_D1":
      updateField = "d1_sent";
      break;
    case "FOLLOWUP_DAY":
      updateField = "followup_msg_sent";
      break;
    default:
      // For other events like INITIAL or CHAT, don't track
      return;
  }

  await db.query(
    `UPDATE agent_customers SET ${updateField} = 1 WHERE agent_id = ? AND customer_id = ?`,
    [agentId, customerId]
  );
}

/**
 * Prepare and send manual WhatsApp message
 */
export async function prepareManuaWhatsAppMessage(
  agentId: number,
  customerId: number,
  triggerEvent: string
): Promise<{
  whatsappUrl: string;
  message: string;
  phone: string;
  logId: number;
}> {
  const [customers]: any = await db.query(
    "SELECT id, name, contact, project_id FROM customers WHERE id = ?",
    [customerId]
  );

  if (!customers.length) {
    throw new Error(`Customer with ID ${customerId} not found`);
  }

  const customer = customers[0];

  if (!validatePhoneNumber(customer.contact)) {
    throw new Error("Invalid customer phone number. Must have at least 10 digits.");
  }

  const [agents]: any = await db.query(
    "SELECT id, first_name, last_name FROM users WHERE id = ?",
    [agentId]
  );

  if (!agents.length) {
    throw new Error(`Agent with ID ${agentId} not found`);
  }

  const agent = agents[0];
  const agentName = `${agent.first_name} ${agent.last_name}`.trim();

  const [projects]: any = await db.query(
    "SELECT id, name FROM projects WHERE id = ?",
    [customer.project_id]
  );

  if (!projects.length) {
    throw new Error(`Project with ID ${customer.project_id} not found`);
  }

  const project = projects[0];

  const template = await getTemplateForEvent(customer.project_id, triggerEvent);

  if (!template) {
    throw new Error(`No active template found for project ${customer.project_id} and event ${triggerEvent}`);
  }

  // NEW: Fetch follow-up details from agent_customers table
  const [agentCustomer]: any = await db.query(
    "SELECT follow_up_date, follow_up_time FROM agent_customers WHERE agent_id = ? AND customer_id = ? ORDER BY id DESC LIMIT 1",
    [agentId, customerId]
  );

  let formattedDate = "";
  let formattedTime = "";

  if (agentCustomer.length > 0) {
    const ac = agentCustomer[0];
    if (ac.follow_up_date) {
      // Formats date to Indian standard format (DD/MM/YYYY)
      formattedDate = new Date(ac.follow_up_date).toLocaleDateString('en-IN'); 
    }
    if (ac.follow_up_time) {
      // Usually comes as HH:MM:SS from MySQL. You can format it further if needed.
      formattedTime = ac.follow_up_time; 
    }
  }

  // UPDATED: Pass the new variables to the renderer
  const renderedMessage = renderTemplateBody(template.template_body, {
    customer_name: customer.name,
    agent_name: agentName,
    project_name: project.name,
    follow_up_date: formattedDate,
    follow_up_time: formattedTime,
  });

  if (!validateRenderedMessage(renderedMessage)) {
    throw new Error("Template rendering failed. Message contains unreplaced placeholders.");
  }

  if (!renderedMessage.trim()) {
    throw new Error("Rendered message is empty");
  }

  const whatsappUrl = generateWhatsAppLink(customer.contact, renderedMessage);

  const logId = await logMessage({
    agent_id: agentId,
    customer_id: customerId,
    project_id: customer.project_id,
    template_id: template.id,
    trigger_event: triggerEvent,
    send_mode: "MANUAL",
    delivery_mode: "WA_LINK",
    recipient_phone: customer.contact,
    message_preview: renderedMessage,
    status: "MANUAL_TRIGGERED",
  });

  // OPTIMISTIC TRACKING: Mark reminder as sent immediately when link is generated
  // User will open the link after this returns
  await markReminderAsSent(agentId, customerId, triggerEvent);

  return {
    whatsappUrl,
    message: renderedMessage,
    phone: customer.contact,
    logId,
  };
}