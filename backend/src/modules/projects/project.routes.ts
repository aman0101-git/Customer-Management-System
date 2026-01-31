import { Router } from "express";
import * as Controller from "./project.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Get all projects with assigned agents
router.get("/", authenticate, Controller.getAllProjectsWithAgents);
// Create a new project
router.post("/", authenticate, Controller.createProject);
// Edit a project
router.put("/:id", authenticate, Controller.updateProject);
// Assign agents to a project
// (Removed bulk assignment route)

// List all agents for a project
router.get("/:id/agents", authenticate, Controller.getProjectAgents);
// Assign a single agent
router.post("/:id/assign", authenticate, Controller.assignAgentToProject);
// Unassign a single agent
router.post("/:id/unassign", authenticate, Controller.unassignAgentFromProject);

export default router;
