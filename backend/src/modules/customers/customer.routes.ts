import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as Controller from "./customer.controller.js";

const router = Router();

// Agent APIs
router.post("/search", authenticate, Controller.searchCustomer);
router.post("/", authenticate, Controller.createCustomer);
router.put("/:agentCustomerId", authenticate, Controller.updateAgentCustomer);

export default router;

