import { Request, Response } from "express";
import ExcelJS from 'exceljs';
import * as Service from "./supervisor.service.js";

export async function getFollowUps(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).user.id;
    const { agentId, projectId, status } = req.query;

    const data = await Service.getSupervisorTeamFollowUps(
      supervisorId,
      (agentId as string) || "all",
      (projectId as string) || "all",
      (status as string) || "all",
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

// NEW: Export Controller
export async function exportSupervisorData(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).user.id;
    const { format, agentId, projectId, status, startDate, endDate } = req.query;

    // 1. Fetch Data
    const rows: any = await Service.getExportData(
      supervisorId,
      (agentId as string) || 'all',
      (projectId as string) || 'all',
      (status as string) || 'all',
      (startDate as string),
      (endDate as string)
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "No data found for the selected criteria" });
    }

    // 2. Setup Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Data');

    // 3. Define Columns (Matches the SQL query aliases)
    worksheet.columns = [
      { header: 'Customer Name', key: 'customer_name', width: 20 },
      { header: 'Contact', key: 'contact', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Pin Code', key: 'pincode', width: 10 },
      { header: 'Profession', key: 'profession', width: 15 },
      { header: 'Designation', key: 'designation', width: 15 },
      { header: 'Created At', key: 'created_at', width: 18 },
      { header: 'Updated At', key: 'updated_at', width: 18 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Budget', key: 'budget', width: 12 },
      { header: 'Configuration', key: 'configuration', width: 12 },
      { header: 'Purpose', key: 'purpose', width: 15 },
      { header: 'Status', key: 'status_code', width: 18 },
      { header: 'Follow-up Date', key: 'follow_up_date', width: 15 },
      { header: 'Follow-up Time', key: 'follow_up_time', width: 12 },
      { header: 'Done Date', key: 'done_date', width: 15 },
      { header: 'Remark', key: 'remark', width: 30 },
      { header: 'Final Status', key: 'final_status', width: 15 },
      { header: 'Project', key: 'project_name', width: 18 },
      { header: 'Agent Name', key: 'agent_first_name', width: 15 },
      { header: 'Agent Last Name', key: 'agent_last_name', width: 15 },
      { header: 'Agent User', key: 'agent_username', width: 15 },
    ];

    // 4. Add Rows
    worksheet.addRows(rows);

    // 5. Style Header
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // 6. Send Response based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
      await workbook.csv.write(res);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=export.xlsx');
      await workbook.xlsx.write(res);
    }

    res.end();

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// --- NEW HANDLER ---
export async function getDrillDownData(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).user.id;
    // Extract Query Params
    const { 
      agentId, projectId, startDate, endDate, 
      statusCode, section, dayNum 
    } = req.query;

    const data = await Service.getSupervisorDrillDown(
      supervisorId,
      (agentId as string) || "all",
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

// --- UPDATED SEARCH HANDLER ---
export async function searchCustomers(req: Request, res: Response) {
  try {
    const { q } = req.query;
    const searchTerm = q as string;

    // Strict regex to check for exactly 10 digits
    const isTenDigits = /^\d{10}$/.test(searchTerm);

    if (!searchTerm || !isTenDigits) {
      return res.status(400).json({ message: "Exact 10-digit contact number is required" });
    }

    const data = await Service.searchGlobalCustomers(searchTerm);
    return res.json(data);
    
  } catch (error) {
    console.error("Global Customer Search Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}