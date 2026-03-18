import { Request, Response } from "express";
import * as Service from "./project.service.js";

// List all agents for a project, with assignment status
export async function getProjectAgents(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const supervisorId = user.id;
    const projectId = Number(req.params.id);
    
    // Pass the project ID, user ID, and the role so the service knows how to filter it
    const agents = await Service.getProjectAgentsService(projectId, supervisorId, user.role);
    res.json(agents);
  } catch (err) {
    console.error("Error fetching project agents:", err);
    res.status(500).json({ error: "Failed to fetch agents" });
  }
}

// Assign a single agent to a project
export async function assignAgentToProject(req: Request, res: Response) {
  try {
    const projectId = Number(req.params.id);
    const { user_id } = req.body;
    await Service.assignAgentToProjectService(projectId, user_id, (req as any).user);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign agent" });
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
    res.status(500).json({ error: "Failed to unassign agent" });
  }
}

export async function getAllProjectsWithAgents(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    
    // FIX: Pass user ID and Role to filter the list
    const projects = await Service.getAllProjectsWithAgentsService(user.id, user.role);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

export async function createProject(req: Request, res: Response) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const project = await Service.createProjectService(req.body, user.id);

  return res.status(201).json(project);
}

export async function updateProject(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const project = await Service.updateProjectService(id, req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: "Failed to update project" });
  }
}