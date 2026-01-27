// Mark agent customer as completed
export async function completeAgentCustomer(req: Request, res: Response) {
  const agentId = req.user.id;
  const agentCustomerId = Number(req.params.id);
  try {
    const result = await Service.completeAgentCustomer(agentCustomerId, agentId);
    if (result === "FORBIDDEN") {
      return res.status(403).json({ message: "Not allowed" });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Failed to complete customer" });
  }
}
// Get all customers assigned to logged-in agent
export async function getAgentCustomers(req: Request, res: Response) {
  const agentId = req.user.id;
  try {
    const customers = await Service.getAgentCustomers(agentId);
    return res.json(customers);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch customers" });
  }
}
import { Request, Response } from "express";
import * as Service from "./customer.service.js";

export async function searchCustomer(req: Request, res: Response) {
  const agentId = req.user.id;
  const { phone } = req.body;

  if (!phone || !/^\d{10}$/.test(phone)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  const result = await Service.searchCustomerForAgent(phone, agentId);

  if (!result) {
    return res.json({ status: "NOT_FOUND" });
  }

  return res.json({ status: "FOUND", data: result });
}

export async function createCustomer(req: Request, res: Response) {
  const agentId = req.user.id;
  const payload = req.body;

  try {
    const record = await Service.createAgentCustomer(agentId, payload);
    return res.status(201).json(record);
  } catch (err: any) {
    if (err.code === "DUPLICATE_ASSIGNMENT") {
      return res.status(409).json({ message: "Customer already assigned" });
    }
    throw err;
  }
}

export async function updateAgentCustomer(req: Request, res: Response) {
  const agentId = req.user.id;
  const agentCustomerId = Number(req.params.agentCustomerId);

  const updated = await Service.updateAgentCustomer(
    agentCustomerId,
    agentId,
    req.body
  );

  if (!updated) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return res.json(updated);
}
