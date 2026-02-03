import { Request, Response } from "express";
import * as Service from "./user.service.js";

// Get All Users (Updated with Count)
export async function getAllUsersWithProjects(req: Request, res: Response) {
  try {
    const users = await Service.getAllUsersWithProjectsService();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// Toggle Deactivate/Activate
export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const userId = Number(req.params.id);
    const { is_active } = req.body; // Expect boolean
    
    await Service.toggleUserStatusService(userId, is_active);
    res.json({ success: true, message: is_active ? "User activated" : "User deactivated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user status" });
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
    res.status(500).json({ error: "Failed to fetch agent projects" });
  }
}

// Assign/Unassign Project to Agent
export async function manageAgentProject(req: Request, res: Response) {
  try {
    const agentId = Number(req.params.id);
    const supervisorId = req.user?.id;
    const { project_id, action } = req.body; // action: 'assign' | 'unassign'

    if (!supervisorId) return res.status(401).json({ message: "Unauthorized" });

    await Service.manageAgentProjectAssignmentService(supervisorId, agentId, project_id, action);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message === "FORBIDDEN_PROJECT") {
      return res.status(403).json({ message: "You can only assign your own projects" });
    }
    res.status(500).json({ error: "Failed to update assignment" });
  }
}