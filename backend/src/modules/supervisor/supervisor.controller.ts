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
// NEW: Export Controller
export async function exportSupervisorData(req: Request, res: Response) {
  try {
    const supervisorId = (req as any).user.id;
    const { format, agentId, projectId, status, startDate, endDate } = req.query;

    // 1. Fetch Data
    let rows: any = await Service.getExportData(
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

    // CSV Fallback: Format dates strictly as DD/MM/YYYY for CSV output
    if (format === 'csv') {
      rows = rows.map((r: any) => ({
        ...r,
        created_at: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '',
        updated_at: r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB') : '',
        follow_up_date: r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString('en-GB') : '',
        done_date: r.done_date ? new Date(r.done_date).toLocaleDateString('en-GB') : ''
      }));
    }

    // 2. Setup Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export Data');

    // 3. Define Columns (Locking dates to dd/mm/yyyy for Excel)
    worksheet.columns = [
      { header: 'Customer Name', key: 'customer_name', width: 20 },
      { header: 'Contact', key: 'contact', width: 15 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Pin Code', key: 'pincode', width: 10 },
      { header: 'Profession', key: 'profession', width: 15 },
      { header: 'Designation', key: 'designation', width: 15 },
      
      { header: 'Created At', key: 'created_at', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Updated At', key: 'updated_at', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Rating', key: 'rating', width: 10 },
      { header: 'Budget', key: 'budget', width: 12 },
      { header: 'Configuration', key: 'configuration', width: 12 },
      { header: 'Purpose', key: 'purpose', width: 15 },
      { header: 'Status', key: 'status_code', width: 18 },
      
      { header: 'Follow-up Date', key: 'follow_up_date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Follow-up Time', key: 'follow_up_time', width: 12 },
      { header: 'Done Date', key: 'done_date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
      { header: 'Full Journey Timeline', key: 'full_history', width: 60, style: { alignment: { wrapText: true } } },
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

    // 6. Send Response
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

// --- NEW: REASSIGN CUSTOMER HANDLER ---
export async function reassignCustomer(req: Request, res: Response) {
  try {
    const customerId = Number(req.params.id);
    const supervisorId = (req as any).user?.id;
    const { new_agent_id, new_project_id } = req.body;

    if (!supervisorId || !new_agent_id || !new_project_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await Service.reassignCustomerTransaction(
      customerId, 
      Number(new_agent_id), 
      Number(new_project_id), 
      supervisorId
    );

    res.json({ success: true, message: "Customer successfully transferred." });
  } catch (error) {
    console.error("Reassignment Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}