import { Request, Response } from "express";
import * as Service from "./project.service.js";

// List all agents for a project, with assignment status
export async function getProjectAgents(req: Request, res: Response) {
  try {
    const supervisorId = req.user.id;
    const projectId = Number(req.params.id);
    const agents = await Service.getProjectAgentsService(projectId, supervisorId);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
}

// Assign a single agent to a project
export async function assignAgentToProject(req: Request, res: Response) {
  try {
    const projectId = Number(req.params.id);
    const { user_id } = req.body;
    await Service.assignAgentToProjectService(projectId, user_id);
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
    const projects = await Service.getAllProjectsWithAgentsService();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
}

export async function createProject(req: Request, res: Response) {
  try {
    const project = await Service.createProjectService(req.body);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: "Failed to create project" });
  }
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

// (Removed bulk assignment controller)
