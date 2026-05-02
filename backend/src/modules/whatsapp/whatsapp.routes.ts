import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as Controller from "./whatsapp.controller.js";

const router = Router();

// =============================================================================
// SUPERVISOR ROUTES: /api/supervisor/whatsapp/*
// =============================================================================

/**
 * GET /api/supervisor/whatsapp/templates
 * List all templates (optionally filtered by projectId query param)
 */
router.get("/templates", authenticate, Controller.listTemplates);

/**
 * POST /api/supervisor/whatsapp/templates
 * Create a new template
 */
router.post("/templates", authenticate, Controller.createTemplate);

/**
 * PATCH /api/supervisor/whatsapp/templates/:id
 * Update a template
 */
router.patch("/templates/:id", authenticate, Controller.updateTemplate);

/**
 * DELETE /api/supervisor/whatsapp/templates/:id
 * Delete a template
 */
router.delete("/templates/:id", authenticate, Controller.deleteTemplate);

// =============================================================================
// AGENT ROUTES: /api/agent/whatsapp/*
// =============================================================================

/**
 * GET /api/agent/whatsapp/template-preview
 * Preview a rendered template with actual customer/agent/project data
 * Query params: projectId, triggerEvent, customerId
 */
router.get("/template-preview", authenticate, Controller.previewTemplate);

/**
 * POST /api/agent/whatsapp/log-message
 * Log a message action (for audit trail)
 */
router.post("/log-message", authenticate, Controller.logMessage);

/**
 * GET /api/agent/whatsapp/message-history/:customerId
 * Get message history for a specific customer
 */
router.get("/message-history/:customerId", authenticate, Controller.getCustomerMessageHistory);

/**
 * GET /api/agent/whatsapp/validate-template (Phase 2)
 * Validate template exists and is properly configured
 */
router.get("/validate-template", authenticate, Controller.validateTemplate);

// Add this line back to your Agent routes section
router.post("/send-manual", authenticate, Controller.sendManualWhatsApp);

export default router;
