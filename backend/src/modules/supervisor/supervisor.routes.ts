import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as Controller from "./supervisor.controller.js";

const router = Router();

// Route: /api/supervisor/summary-dashboard
router.get("/summary-dashboard", authenticate, Controller.getSummaryDashboard);
// Agent Performance Matrix - pre-aggregated agent x status analytics
router.get("/matrix", authenticate, Controller.getAgentMatrix);
router.get("/follow-ups", authenticate, Controller.getFollowUps);
router.get("/export", authenticate, Controller.exportSupervisorData);
router.get("/drill-down", authenticate, Controller.getDrillDownData);
router.get("/customers/search", authenticate, Controller.searchCustomers);
// Phase 6: read-only customer journey for the supervisor audit view.
// :id is the agent_customers.id (not customers.id).
router.get("/customers/:id/journey", authenticate, Controller.getCustomerJourney);
router.put("/customers/:id/reassign", authenticate, Controller.reassignCustomer);

// WhatsApp Audit Log (Profile-Centric Workflow)
router.get("/whatsapp/audit", authenticate, Controller.getWhatsAppAuditLog);

export default router;