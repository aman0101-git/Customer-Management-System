import { Router } from "express";
import * as Controller from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Get all users (Table view)
router.get("/", authenticate, Controller.getAllUsersWithProjects);

// Toggle User Status (Activate/Deactivate)
router.patch("/:id/status", authenticate, Controller.toggleUserStatus);

// Get Projects specific to Supervisor -> Agent relationship
router.get("/:id/projects", authenticate, Controller.getAgentProjects);

// Assign/Unassign Project
router.post("/:id/projects", authenticate, Controller.manageAgentProject);

export default router;