import { Request, Response } from "express";
import * as Service from "./supervisor.service.js";

export async function getFollowUps(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).user.id;
    const { agentId, projectId } = req.query;

    const data = await Service.getSupervisorTeamFollowUps(
      supervisorId,
      (agentId as string) || "all",
      (projectId as string) || "all"
    );

    return res.json(data);
  } catch (error) {
    console.error("Supervisor FollowUps Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSummaryDashboard(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).user.id; 
    const { section, projectId, agentId, startDate, endDate } = req.query;

    const targetAgent = (agentId as string) || "all";
    const start = startDate as string;
    const end = endDate as string;

    // 1. Fetch Agents for Filter
    if (section === "associates") {
       const data = await Service.getAssociates(supervisorId);
       return res.json(data);
    }
    // 2. Fetch Projects for Filter (FIXED)
    else if (section === "projects") {
       const data = await Service.getSupervisorProjects(supervisorId);
       return res.json(data);
    }
    // 3. Main Data Sections
    else if (section === "1") {
      const data = await Service.getSupervisorVisitsBooking(supervisorId, targetAgent, projectId as string, start, end);
      return res.json(data);
    } 
    else if (section === "2") {
      const data = await Service.getSupervisorPipeline(supervisorId, targetAgent, projectId as string, start, end);
      return res.json(data);
    }
    else if (section === "3") {
      const data = await Service.getSupervisorStatusCounts(supervisorId, targetAgent, projectId as string, start, end);
      return res.json(data);
    }

    return res.status(400).json({ message: "Invalid section" });

  } catch (error) {
    console.error("Supervisor Dashboard Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}