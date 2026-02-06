import { Request, Response } from "express";
import * as Service from "./customer.service.js";

// Get merged customer + agent_customer for edit
export async function getAgentCustomerById(req: Request, res: Response) {
  const agentId = req.user?.id; // Type is number | undefined
  const agentCustomerId = Number(req.params.id);

  // This check is your "Type Guard"
  if (agentId === undefined) { 
    return res.status(401).json({ message: "Unauthorized" }); 
  }

  if (!agentCustomerId) return res.status(400).json({ message: "Missing id" });

  // Add the '!' after agentId to assert it is a number
  const result = await Service.getAgentCustomerMerged(agentCustomerId, agentId!);
  
  if (!result) return res.status(404).json({ message: "Not found" });

  const history = await Service.getCustomerRemarkHistory(agentCustomerId);
  res.json({ ...result, history });
}

// Mark agent customer as completed
export async function completeAgentCustomer(req: Request, res: Response) {
  const agentId = req.user?.id;

  if (!agentId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const agentCustomerId = Number(req.params.id);

  try {
    const result = await Service.completeAgentCustomer(agentCustomerId, agentId);
    if (result === "FORBIDDEN") {
      return res.status(403).json({ message: "Not allowed" });
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: "Failed to complete customer" });
  }
}

// Get all customers assigned to logged-in agent
export async function getAgentCustomers(req: Request, res: Response) {
  const agentId = req.user?.id;

  if (!agentId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const customers = await Service.getAgentCustomers(agentId);
    return res.json(customers);
  } catch (err) {
    console.error("Error fetching customers:", err);
    return res.status(500).json({ message: "Failed to fetch customers" });
  }
}

export async function searchCustomer(req: Request, res: Response) {
  const agentId = req.user?.id;

  if (!agentId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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
  const agentId = req.user?.id;

  if (!agentId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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
  const agentId = req.user?.id;

  if (!agentId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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

export async function getSummaryDashboard(req: Request, res: Response) {
  try {
    const agentId = (req as any).user.id;
    const { section, projectId, period, timeFilter, startDate, endDate } = req.query;

    // Helper to calculate dates if standard period (Today, This Week) is passed
    // You can also handle this on frontend and pass exact dates. 
    // Assuming Frontend passes exact YYYY-MM-DD strings for start/end to keep backend simple.
    
    const start = startDate as string;
    const end = endDate as string;

    if (section === "1") {
      // Visits and Booking
      const data = await Service.getDashboardVisitsBooking(agentId, projectId as string, start, end);
      return res.json(data);
    } 
    else if (section === "2") {
      const data = await Service.getDashboardPipeline(
        agentId,
        start,
        end,
        req.query.mode as string || "all"
      );
      return res.json(data);
    }
    else if (section === "3") {
      // Status Counts
      const data = await Service.getDashboardStatusCounts(agentId, projectId as string, start, end);
      return res.json(data);
    }
    else if (section === "projects") {
      // Filter list
      const data = await Service.getAgentProjects(agentId);
      return res.json(data);
    }

    return res.status(400).json({ message: "Invalid section" });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getFollowUps(req: Request, res: Response) {
  try {
    const agentId = (req as any).user.id;
    const data = await Service.getAgentFollowUps(agentId);
    res.json(data);
  } catch (error) {
    console.error("Follow-up fetch error:", error);
    res.status(500).json({ message: "Failed to fetch follow-ups" });
  }
}