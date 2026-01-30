import { Request, Response } from "express";
import { getAllUsersWithProjectsService } from "./user.service.js";

export async function getAllUsersWithProjects(req: Request, res: Response) {
  try {
    const users = await getAllUsersWithProjectsService();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}
