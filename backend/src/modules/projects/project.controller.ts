// Phase 9 (May 2026): Added missing try/catch on createProject. Standardized
// all error responses to { message } shape (was { error } in some handlers).
import { Request, Response } from "express";
import * as Service from "./project.service.js";

// List all agents for a project, with assignment status
export async function getProjectAgents(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const supervisorId = user.id;
    const projectId = Number(req.params.id);

    const agents = await Service.getProjectAgentsService(projectId, supervisorId, user.role);
    res.json(agents);
  } catch (err) {
    console.error("Error fetching project agents:", err);
    res.status(500).json({ message: "Failed to fetch agents" });
  }
}

// Assign a single agent to a project
export async function assignAgentToProject(req: Request, res: Response) {
  try {
    const projectId = Number(req.params.id);
    const { user_id } = req.body;
    await Service.assignAgentToProjectService(projectId, user_id, req.user!);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign agent" });
  }
}

// Unassign a single agent from a project
export async function unassignAgentFromProject(req: Request, res: Response) {
  try {
    const projectId = Number(req.params.id);
    const { user_id } = req.body;
    await Service.unassignAgentFromProjectService(projectId, user_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to unassign agent" });
  }
}

export async function getAllProjectsWithAgents(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const projects = await Service.getAllProjectsWithAgentsService(user.id, user.role);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
}

// Phase 9: Added missing try/catch — createProject had none, meaning any
// service-layer throw would propagate uncaught (now handled by global error
// handler in Express 5, but explicit catch is cleaner and logs context).
export async function createProject(req: Request, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await Service.createProjectService(req.body, user.id);
    return res.status(201).json(project);
  } catch (err) {
    console.error("Error creating project:", err);
    return res.status(500).json({ message: "Failed to create project" });
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const project = await Service.updateProjectService(id, req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: "Failed to update project" });
  }
}

// Deactivate Project (soft delete)
export async function deactivateProject(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    await Service.deactivateProjectService(id);
    res.json({ success: true, message: "Project deactivated successfully" });
  } catch (err) {
    console.error("Error deactivating project:", err);
    res.status(500).json({ message: "Failed to deactivate project" });
  }
}