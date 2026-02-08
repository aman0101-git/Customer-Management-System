import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as Controller from "./supervisor.controller.js";

const router = Router();

// Route: /api/supervisor/summary-dashboard
router.get("/summary-dashboard", authenticate, Controller.getSummaryDashboard);
router.get("/follow-ups", authenticate, Controller.getFollowUps);

export default router;