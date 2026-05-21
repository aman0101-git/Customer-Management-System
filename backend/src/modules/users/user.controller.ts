// Phase 9 (May 2026): Standardized all error responses to { message } shape
// (was { error } in some handlers — inconsistent with the rest of the API).
import { Request, Response } from "express";
import * as Service from "./user.service.js";

// Get All Users (Updated with Count & Security Filter)
export async function getAllUsersWithProjects(req: Request, res: Response) {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const users = await Service.getAllUsersWithProjectsService(currentUser);
    res.json(users);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
}

// Toggle Deactivate/Activate
export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const userId = Number(req.params.id);
    const { is_active } = req.body;

    await Service.toggleUserStatusService(userId, is_active);
    res.json({ success: true, message: is_active ? "User activated" : "User deactivated" });
  } catch (err) {
    console.error("Toggle user status error:", err);
    res.status(500).json({ message: "Failed to update user status" });
  }
}

// Get Projects for Agent (Supervisor Context)
export async function getAgentProjects(req: Request, res: Response) {
  try {
    const agentId = Number(req.params.id);
    const supervisorId = req.user?.id;

    if (!supervisorId) return res.status(401).json({ message: "Unauthorized" });

    const projects = await Service.getSupervisorProjectsForAgentService(supervisorId, agentId);
    res.json(projects);
  } catch (err) {
    console.error("Fetch agent projects error:", err);
    res.status(500).json({ message: "Failed to fetch agent projects" });
  }
}

// Assign/Unassign Project to Agent
export async function manageAgentProject(req: Request, res: Response) {
  try {
    const agentId = Number(req.params.id);
    const supervisorId = req.user?.id;
    const { project_id, action } = req.body;

    if (!supervisorId) return res.status(401).json({ message: "Unauthorized" });

    await Service.manageAgentProjectAssignmentService(supervisorId, agentId, project_id, action);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === "FORBIDDEN_PROJECT") {
      return res.status(403).json({ message: "You can only assign your own projects" });
    }
    console.error("Manage agent project error:", err);
    res.status(500).json({ message: "Failed to update assignment" });
  }
}