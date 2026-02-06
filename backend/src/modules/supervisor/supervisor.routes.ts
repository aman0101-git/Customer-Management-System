import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as Controller from "./supervisor.controller.js";

const router = Router();

// Route: /api/supervisor/summary-dashboard
router.get("/summary-dashboard", authenticate, Controller.getSummaryDashboard);

export default router;