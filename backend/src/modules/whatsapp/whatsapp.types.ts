/**
 * WhatsApp Messaging System Type Definitions
 * Phase 1 - Template Management & Message Logging
 */

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type TriggerEvent = "INITIAL" | "REMINDER_D3" | "REMINDER_D1" | "FOLLOWUP_DAY";
export type LanguageCode = string; // e.g., "en", "es", "fr"

export interface WhatsAppTemplate {
  id: number;
  project_id: number;
  trigger_event: TriggerEvent;
  template_name: string;
  template_body: string;
  language_code: LanguageCode;
  variables_json: string;
  is_active: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateWithProject extends WhatsAppTemplate {
  project_name?: string;
  variables?: string[];
}

export interface CreateTemplateInput {
  project_id: number;
  trigger_event: TriggerEvent;
  template_name: string;
  template_body: string;
  language_code?: LanguageCode;
  variables_json?: string;
  is_active?: number;
  created_by: number;
}

export interface UpdateTemplateInput {
  template_name?: string;
  template_body?: string;
  variables_json?: string;
  is_active?: number;
  updated_by: number;
}

// ============================================================================
// MESSAGE LOG TYPES
// ============================================================================

export type SendMode = "MANUAL" | "AUTOMATIC";
export type DeliveryMode = "WHATSAPP_WEB" | "WHATSAPP_API";
export type MessageStatus = "DRAFTED" | "SENT" | "DELIVERED" | "FAILED";

export interface WhatsAppMessageLog {
  id: number;
  agent_id: number;
  customer_id: number;
  project_id: number;
  template_id: number;
  trigger_event: string;
  send_mode: SendMode;
  delivery_mode: DeliveryMode;
  recipient_phone: string;
  message_preview: string;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateMessageLogInput {
  agent_id: number;
  customer_id: number;
  project_id: number;
  template_id: number;
  trigger_event: string;
  send_mode: SendMode;
  delivery_mode: DeliveryMode;
  recipient_phone: string;
  message_preview: string;
  status: MessageStatus;
}

// ============================================================================
// TEMPLATE RENDERING TYPES
// ============================================================================

export interface TemplateVariables {
  customer_name: string;
  agent_name: string;
  project_name: string;
}

export interface TemplateRenderContext {
  template: WhatsAppTemplate;
  variables: TemplateVariables;
}

export interface TemplateRenderResult {
  original: string;
  rendered: string;
  variables_used: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  count?: number;
}

export interface TemplateListResponse extends ApiResponse<WhatsAppTemplateWithProject[]> {
  count: number;
}

export interface MessageLogListResponse extends ApiResponse<WhatsAppMessageLog[]> {
  count: number;
}

export interface TemplatePreviewResponse extends ApiResponse<{
  template_id: number;
  template_name: string;
  trigger_event: string;
  original_body: string;
  rendered_body: string;
  variables_used: string[];
  customer_phone: string;
  customer_name: string;
  agent_name: string;
  project_name: string;
}> {}

// ============================================================================
// PROJECT & USER TYPES (References)
// ============================================================================

export interface Project {
  id: number;
  name: string;
  [key: string]: any;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  [key: string]: any;
}

export interface Customer {
  id: number;
  name: string;
  contact: string;
  project_id: number;
  [key: string]: any;
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

export interface TemplateFormState {
  project_id: string;
  trigger_event: string;
  template_name: string;
  template_body: string;
  language_code?: string;
  is_active: number;
  variables_json: string;
}

export interface TemplatePreviewFormState {
  customer_name: string;
  agent_name: string;
  project_name: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const TRIGGER_EVENTS: Record<TriggerEvent, string> = {
  INITIAL: "Initial Contact",
  REMINDER_D3: "Reminder (Day 3)",
  REMINDER_D1: "Reminder (Day 1)",
  FOLLOWUP_DAY: "Follow-up Day",
};

export const SEND_MODES: Record<SendMode, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automatic",
};

export const DELIVERY_MODES: Record<DeliveryMode, string> = {
  WHATSAPP_WEB: "WhatsApp Web",
  WHATSAPP_API: "WhatsApp API",
};

export const MESSAGE_STATUSES: Record<MessageStatus, string> = {
  DRAFTED: "Drafted",
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
};

export const TEMPLATE_VARIABLES = [
  {
    name: "customer_name",
    description: "Customer's full name",
    placeholder: "{{customer_name}}",
  },
  {
    name: "agent_name",
    description: "Agent's full name",
    placeholder: "{{agent_name}}",
  },
  {
    name: "project_name",
    description: "Project name",
    placeholder: "{{project_name}}",
  },
];
