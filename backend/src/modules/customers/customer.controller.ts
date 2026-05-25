import { Request, Response } from "express";
import * as Service from "./customer.service.js";

// Get merged customer + agent_customer for edit
// Phase 9: Added missing try/catch — DB failures previously propagated uncaught.
export async function getAgentCustomerById(req: Request, res: Response) {
  try {
    const agentId = req.user?.id;
    const agentCustomerId = Number(req.params.id);

    if (agentId === undefined) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!agentCustomerId) return res.status(400).json({ message: "Missing id" });

    const result = await Service.getAgentCustomerMerged(agentCustomerId, agentId);

    if (!result) return res.status(404).json({ message: "Not found" });

    const history = await Service.getCustomerRemarkHistory(agentCustomerId);
    res.json({ ...result, history });
  } catch (err) {
    console.error("Error fetching agent customer:", err);
    return res.status(500).json({ message: "Failed to fetch customer" });
  }
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
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const payload = req.body;

  try {
    const result = await Service.createAgentCustomer(agentId, payload);
    return res.status(201).json(result);
  } catch (err: any) {
    console.error("Error creating customer:", err);
    if (err.code === "DUPLICATE_ASSIGNMENT") {
      return res.status(409).json({ success: false, message: "Customer already assigned" });
    }
    return res.status(500).json({ success: false, message: "Failed to create customer" });
  }
}

// Phase 9: Added missing try/catch — updateAgentCustomer had no error handling.
export async function updateAgentCustomer(req: Request, res: Response) {
  try {
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
  } catch (err) {
    console.error("Error updating agent customer:", err);
    return res.status(500).json({ message: "Failed to update customer" });
  }
}

export async function getSummaryDashboard(req: Request, res: Response) {
  try {
    const agentId = req.user!.id;
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
    const agentId = req.user!.id;
    const data = await Service.getAgentFollowUps(agentId);
    res.json(data);
  } catch (error) {
    console.error("Follow-up fetch error:", error);
    res.status(500).json({ message: "Failed to fetch follow-ups" });
  }
}

// ----------------------------------------------------------------------------
// AGENT DASHBOARD ANALYTICS (May 2026)
// ----------------------------------------------------------------------------
// One consolidated GET that returns every KPI / chart / top-list the
// AgentDashboard needs. All 6 underlying queries run in parallel via
// Promise.all, so wall-clock latency is max(query) not sum(query).
//
// Query params:
//   startDate  YYYY-MM-DD  (inclusive lower bound - required)
//   endDate    YYYY-MM-DD  (inclusive upper bound - required)
//
// Date strings are validated as strict YYYY-MM-DD; we never pass arbitrary
// input through to the SQL layer. Anything malformed -> 400.
// ----------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function getAgentAnalytics(req: Request, res: Response) {
  try {
    const agentId = req.user?.id;
    if (!agentId) return res.status(401).json({ message: "Unauthorized" });

    const { startDate, endDate } = req.query;
    if (
      typeof startDate !== "string" || !ISO_DATE.test(startDate) ||
      typeof endDate   !== "string" || !ISO_DATE.test(endDate)
    ) {
      return res.status(400).json({
        message: "startDate and endDate are required (YYYY-MM-DD).",
      });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: "startDate must be <= endDate." });
    }

    const [
      customerCounts,
      followupTimeline,
      followupStatusDistribution,
      summaryStatusDistribution,
      topCustomers,
      topFollowups,
    ] = await Promise.all([
      Service.getAgentAnalyticsCustomerCounts(agentId, startDate, endDate),
      Service.getAgentAnalyticsFollowupTimeline(agentId),
      Service.getAgentAnalyticsFollowupStatusDistribution(agentId, startDate, endDate),
      Service.getAgentAnalyticsSummaryDistribution(agentId, startDate, endDate),
      Service.getAgentAnalyticsTopCustomers(agentId, startDate, endDate),
      Service.getAgentAnalyticsTopFollowups(agentId),
    ]);

    return res.json({
      range: { startDate, endDate },
      customersCreated: customerCounts.customersCreated,
      customersUpdated: customerCounts.customersUpdated,
      followupTimeline,
      followupStatusDistribution,
      summaryStatusDistribution,
      topCustomers,
      topFollowups,
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    return res.status(500).json({ message: "Failed to fetch analytics" });
  }
}

// --- DRILL DOWN HANDLER (preserved) ---
export async function getDrillDownData(req: Request, res: Response) {
  try {
    const agentId = req.user!.id;
    if (!agentId) return res.status(401).json({ message: "Unauthorized" });

    const {
      projectId, startDate, endDate,
      statusCode, section, dayNum
    } = req.query;

    const data = await Service.getAgentDrillDown(
      agentId,
      (projectId as string) || "all",
      startDate as string,
      endDate as string,
      statusCode as string,
      section as string,
      dayNum ? Number(dayNum) : undefined
    );

    return res.json(data);
  } catch (error) {
    console.error("Drill Down Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
