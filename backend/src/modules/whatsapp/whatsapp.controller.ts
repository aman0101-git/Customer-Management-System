import { Request, Response } from "express";
import * as Service from "./whatsapp.service.js";
import { db } from "../../config/db.js";
import * as Repository from "./whatsapp.repository.js";

// =============================================================================
// SUPERVISOR: TEMPLATE MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/supervisor/whatsapp/templates
 * List all templates (optionally filtered by project_id)
 */
export async function listTemplates(req: Request, res: Response) {
  try {
    const { projectId } = req.query;

    let templates;
    if (projectId) {
      templates = await Service.listTemplatesByProject(Number(projectId));
    } else {
      templates = await Service.listAllTemplates();
    }

    res.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error("Error listing templates:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to list templates" });
  }
}

/**
 * POST /api/supervisor/whatsapp/templates
 * Create a new template
 */
export async function createTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      project_id,
      trigger_event,
      template_name,
      template_body,
      language_code = "en",
      variables_json = "{}",
      is_active = 1,
    } = req.body;

    // Validate required fields
    if (!project_id || !trigger_event || !template_name || !template_body) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: project_id, trigger_event, template_name, template_body",
      });
    }

    const templateId = await Service.createTemplate({
      project_id,
      trigger_event,
      template_name,
      template_body,
      language_code,
      variables_json,
      is_active,
      created_by: userId,
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: { id: templateId },
    });
  } catch (error: any) {
    console.error("Error creating template:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/supervisor/whatsapp/templates/:id
 * Update a template
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const templateId = Number(req.params.id);
    const {
      template_name,
      template_body,
      variables_json,
      is_active,
    } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: "Invalid template ID" });
    }

    await Service.updateTemplate(templateId, {
      template_name,
      template_body,
      variables_json,
      is_active,
      updated_by: userId,
    });

    res.json({
      success: true,
      message: "Template updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating template:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/supervisor/whatsapp/templates/:id
 * Delete a template
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const templateId = Number(req.params.id);
    if (!templateId) {
      return res.status(400).json({ success: false, message: "Invalid template ID" });
    }

    await Service.deleteTemplate(templateId);

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

// =============================================================================
// AGENT: TEMPLATE PREVIEW & RENDERING
// =============================================================================

/**
 * GET /api/agent/whatsapp/template-preview
 * Preview a rendered template with actual customer/agent/project data
 * Query params: projectId, triggerEvent, customerId
 */
export async function previewTemplate(req: Request, res: Response) {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { projectId, triggerEvent, customerId } = req.query;

    // Validate inputs
    if (!projectId || !triggerEvent || !customerId) {
      return res.status(400).json({
        success: false,
        message: "Missing required query params: projectId, triggerEvent, customerId",
      });
    }

    // Fetch template by project_id + trigger_event
    const template = await Service.getTemplateForEvent(
      Number(projectId),
      String(triggerEvent)
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `No template found for project ${projectId} and event ${triggerEvent}`,
      });
    }

    // Fetch customer data
    const [customers]: any = await db.query(
      "SELECT id, name, contact FROM customers WHERE id = ?",
      [Number(customerId)]
    );

    if (!customers.length) {
      return res.status(404).json({
        success: false,
        message: `Customer with ID ${customerId} not found`,
      });
    }

    const customer = customers[0];

    // Fetch agent data
    const [agents]: any = await db.query(
      "SELECT id, first_name, last_name FROM users WHERE id = ?",
      [agentId]
    );

    const agent = agents[0];
    const agentName = agent ? `${agent.first_name} ${agent.last_name}`.trim() : "Agent";

    // Fetch project data
    const [projects]: any = await db.query(
      "SELECT id, name FROM projects WHERE id = ?",
      [Number(projectId)]
    );

    if (!projects.length) {
      return res.status(404).json({
        success: false,
        message: `Project with ID ${projectId} not found`,
      });
    }

    const project = projects[0];

    // Render template with actual data
    const variables = {
      customer_name: customer.name,
      agent_name: agentName,
      project_name: project.name,
    };

    const renderedBody = Service.renderTemplateBody(template.template_body, variables);
    const extractedVars = Service.extractTemplateVariables(template.template_body);

    res.json({
      success: true,
      data: {
        template_id: template.id,
        template_name: template.template_name,
        trigger_event: template.trigger_event,
        original_body: template.template_body,
        rendered_body: renderedBody,
        variables_used: extractedVars,
        customer_phone: customer.contact,
        customer_name: customer.name,
        agent_name: agentName,
        project_name: project.name,
      },
    });
  } catch (error: any) {
    console.error("Error previewing template:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to preview template",
    });
  }
}

/**
 * POST /api/agent/whatsapp/log-message
 * Log a message action (for audit trail)
 * Body: agent_id, customer_id, project_id, template_id, trigger_event, send_mode, delivery_mode, recipient_phone, message_preview, status
 */
export async function logMessage(req: Request, res: Response) {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      customer_id,
      project_id,
      template_id,
      trigger_event,
      send_mode = "MANUAL",
      delivery_mode = "WHATSAPP_WEB",
      recipient_phone,
      message_preview,
      status = "DRAFTED",
    } = req.body;

    if (!customer_id || !project_id || !template_id || !recipient_phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const logId = await Service.logMessage({
      agent_id: agentId,
      customer_id,
      project_id,
      template_id,
      trigger_event,
      send_mode,
      delivery_mode,
      recipient_phone,
      message_preview,
      status,
    });

    res.status(201).json({
      success: true,
      message: "Message logged successfully",
      data: { id: logId },
    });
  } catch (error: any) {
    console.error("Error logging message:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/agent/whatsapp/message-history/:customerId
 * Get message history for a specific customer
 */
export async function getCustomerMessageHistory(req: Request, res: Response) {
  try {
    const customerId = Number(req.params.customerId);
    if (!customerId) {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }

    const history = await Service.getCustomerMessageHistory(customerId);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error: any) {
    console.error("Error fetching message history:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// =============================================================================
// AGENT: MANUAL WHATSAPP SENDING (Phase 2)
// =============================================================================

/**
 * POST /api/agent/whatsapp/send-manual
 * Send WhatsApp message manually using wa.me link
 * 
 * Process:
 * 1. Get customer details
 * 2. Fetch and render template
 * 3. Generate wa.me link
 * 4. Log message action
 * 5. Return URL to open in new tab
 */
export async function sendManualWhatsApp(req: Request, res: Response) {
  try {
    const agentId = req.user?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { customerId, triggerEvent } = req.body;

    // Validate inputs
    if (!customerId || !triggerEvent) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: customerId, triggerEvent",
      });
    }

    // Prepare message and generate wa.me link
    const result = await Service.prepareManuaWhatsAppMessage(
      agentId,
      Number(customerId),
      String(triggerEvent)
    );

    res.json({
      success: true,
      message: "Message prepared successfully. Opening WhatsApp...",
      data: {
        whatsappUrl: result.whatsappUrl,
        message: result.message,
        phone: result.phone,
        logId: result.logId,
      },
    });
  } catch (error: any) {
    console.error("Error sending manual WhatsApp:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to prepare WhatsApp message",
    });
  }
}

/**
 * GET /api/agent/whatsapp/validate-template
 * Validate template for a given project and trigger event
 * Query params: projectId, triggerEvent
 */
export async function validateTemplate(req: Request, res: Response) {
  try {
    const { projectId, triggerEvent } = req.query;

    if (!projectId || !triggerEvent) {
      return res.status(400).json({
        success: false,
        message: "Missing required query params: projectId, triggerEvent",
      });
    }

    // Fetch template
    const template = await Service.getTemplateForEvent(
      Number(projectId),
      String(triggerEvent)
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `No active template found for project ${projectId} and event ${triggerEvent}`,
        data: {
          exists: false,
        },
      });
    }

    // Extract variables from template
    const extractedVars = Service.extractTemplateVariables(template.template_body);

    res.json({
      success: true,
      data: {
        exists: true,
        template_id: template.id,
        template_name: template.template_name,
        trigger_event: template.trigger_event,
        variables_used: extractedVars,
        has_valid_structure: true,
      },
    });
  } catch (error: any) {
    console.error("Error validating template:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to validate template",
    });
  }
}
