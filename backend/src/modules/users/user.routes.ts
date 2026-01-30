import { Router } from "express";
import * as Controller from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

// Get all users with their projects
router.get("/", authenticate, Controller.getAllUsersWithProjects);

export default router;
