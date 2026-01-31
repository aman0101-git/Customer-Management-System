import { Request, Response } from "express";
import * as Service from "./project.service.js";

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

export async function assignAgentsToProject(req: Request, res: Response) {
  try {
    const projectId = Number(req.params.id);
    let agentIds: number[] = Array.isArray(req.body.agentIds)
      ? req.body.agentIds.map(Number)
      : typeof req.body.agentIds === 'string'
        ? req.body.agentIds.split(',').map(Number)
        : [];
    const result = await Service.assignAgentsToProjectService(projectId, agentIds);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to assign agents" });
  }
}
