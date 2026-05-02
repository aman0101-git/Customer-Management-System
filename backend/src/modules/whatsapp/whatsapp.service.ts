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
 * Fetch template by project_id + trigger_event (which is now our template_code)
 * Returns null if no active template found
 */
export async function getTemplateForEvent(
  projectId: number,
  triggerEvent: string
): Promise<WhatsAppTemplate | null> {
  const template = await Repository.getTemplateByProjectAndEvent(projectId, triggerEvent);
  if (!template) {
    throw new Error(`No active template found for project ${projectId} and code ${triggerEvent}`);
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

  // Validate trigger_event (Updated to our 10 new Status codes)
  const validEvents = ["INITIAL", "VC", "VP", "VMC", "VM", "SDOW", "NR", "VD", "BD", "LOST", "FU"];
  if (!validEvents.includes(data.trigger_event)) {
    throw new Error(`Invalid template code. Must be one of: ${validEvents.join(", ")}`);
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
// MANUAL WHATSAPP SENDING SERVICE
// =============================================================================

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 10;
}

/**
 * Check if rendered message has any remaining placeholders
 */
export function validateRenderedMessage(renderedMessage: string): boolean {
  const placeholderRegex = /{{(\w+)}}/g;
  return !placeholderRegex.test(renderedMessage);
}

/**
 * Generate WhatsApp wa.me link
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
 * Prepare and send manual WhatsApp message
 */
export async function prepareManualWhatsAppMessage(
  agentId: number,
  customerId: number,
  templateCode: string
): Promise<{
  whatsappUrl: string;
  message: string;
  phone: string;
  logId: number;
}> {
  // 1. BULLETPROOF LOOKUP: Finds true customer ID
  const [customers]: any = await db.query(
    `SELECT c.id, c.name, c.contact, c.project_id 
     FROM customers c 
     WHERE c.id = ? 
        OR c.id = (SELECT customer_id FROM agent_customers WHERE id = ? LIMIT 1)`,
    [customerId, customerId]
  );

  if (!customers.length) {
    throw new Error(`Customer with ID ${customerId} not found`);
  }

  const customer = customers[0];
  const actualCustomerId = customer.id; // <-- Storing the TRUE customer ID to use below

  if (!validatePhoneNumber(customer.contact)) {
    throw new Error("Invalid customer phone number. Must have at least 10 digits.");
  }

  // 2. Fetch Agent Details (First Name Only!)
  const [agents]: any = await db.query(
    "SELECT id, first_name FROM users WHERE id = ?",
    [agentId]
  );

  if (!agents.length) {
    throw new Error(`Agent with ID ${agentId} not found`);
  }

  const agent = agents[0];
  const agentName = `${agent.first_name}`.trim(); // <-- Only First Name now

  // 3. Fetch Project
  const [projects]: any = await db.query(
    "SELECT id, name FROM projects WHERE id = ?",
    [customer.project_id]
  );

  if (!projects.length) {
    throw new Error(`Project with ID ${customer.project_id} not found`);
  }

  const project = projects[0];

  // 4. Fetch Template
  const template = await getTemplateForEvent(customer.project_id, templateCode);

  if (!template) {
    throw new Error(`No active template found for project ${customer.project_id} and event ${templateCode}`);
  }

  // 5. Fetch Follow-up Dates USING THE TRUE CUSTOMER ID
  const [agentCustomer]: any = await db.query(
    "SELECT follow_up_date, follow_up_time FROM agent_customers WHERE agent_id = ? AND customer_id = ? ORDER BY id DESC LIMIT 1",
    [agentId, actualCustomerId] 
  );

  let formattedDate = "";
  let formattedTime = "";

  if (agentCustomer.length > 0) {
    const ac = agentCustomer[0];
    if (ac.follow_up_date) {
      // Format as nicely readable Indian date
      formattedDate = new Date(ac.follow_up_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }); 
    }
    
    if (ac.follow_up_time) {
      const timeStr = String(ac.follow_up_time).trim();
      
      // BULLETPROOF CHECK: Does it already have AM/PM?
      if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
        // It's already formatted, just use it!
        formattedTime = timeStr;
      } else {
        // It's likely a 24-hour SQL string (e.g., "14:30:00" or "14:30")
        try {
          const parts = timeStr.split(':');
          if (parts.length >= 2) {
            const h = parseInt(parts[0], 10);
            const minutes = parts[1];
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            formattedTime = `${h12}:${minutes} ${ampm}`;
          } else {
             formattedTime = timeStr; // Fallback if format is totally weird
          }
        } catch (e) {
          formattedTime = timeStr; // fallback
        }
      }
    }
  }

  // 6. Render the template
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

  // 7. Generate Link & Log
  const whatsappUrl = generateWhatsAppLink(customer.contact, renderedMessage);

  const logId = await logMessage({
    agent_id: agentId,
    customer_id: actualCustomerId, // <-- Ensure log is attached to true customer ID
    project_id: customer.project_id,
    template_id: template.id,
    trigger_event: templateCode,
    send_mode: "MANUAL",
    delivery_mode: "WA_LINK",
    recipient_phone: customer.contact,
    message_preview: renderedMessage,
    status: "MANUAL_TRIGGERED",
  });

  return {
    whatsappUrl,
    message: renderedMessage,
    phone: customer.contact,
    logId,
  };
}