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
router.post("/:id/assign", authenticate, Controller.assignAgentsToProject);

export default router;
