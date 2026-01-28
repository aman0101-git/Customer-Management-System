// Mark customer as completed
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as Controller from "./customer.controller.js";

const router = Router();

// Agent APIs

// My Customers List (base path)
router.get("/", authenticate, Controller.getAgentCustomers);
router.get("/:id", authenticate, Controller.getAgentCustomerById);
router.patch("/:id/complete", authenticate, Controller.completeAgentCustomer);
router.post("/search", authenticate, Controller.searchCustomer);
router.post("/", authenticate, Controller.createCustomer);
router.put("/:agentCustomerId", authenticate, Controller.updateAgentCustomer);

export default router;

