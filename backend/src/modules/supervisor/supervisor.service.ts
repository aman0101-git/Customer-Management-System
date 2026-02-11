import { db } from "../../config/db.js";

// Helper: Get SQL condition to filter by Agents
const getAgentCondition = (supervisorId: number, filterAgentId: string) => {
  if (filterAgentId && filterAgentId !== "all") {
    return {
      sql: " AND ac.agent_id = ? AND ac.agent_id IN (SELECT id FROM users WHERE supervisor_id = ?) ",
      params: [filterAgentId, supervisorId]
    };
  } else {
    return {
      sql: " AND ac.agent_id IN (SELECT id FROM users WHERE supervisor_id = ?) ",
      params: [supervisorId]
    };
  }
};

export async function getSupervisorProjects(supervisorId: number) {
  const [rows]: any = await db.query(
    `SELECT id, name 
     FROM projects 
     WHERE created_by = ? AND is_active = 1 
     ORDER BY created_at DESC`,
    [supervisorId]
  );
  return rows;
}

// 1. Get List of Agents for the Dropdown
export async function getAssociates(supervisorId: number) {
  const [rows]: any = await db.query(
    "SELECT id, CONCAT(first_name, ' ', last_name) as name FROM users WHERE supervisor_id = ? AND is_active = 1",
    [supervisorId]
  );
  return rows;
}

// ---------------- DASHBOARD FUNCTIONS ---------------- //

// 1. VISITS & BOOKINGS (Cards)
// Rule: VC, VP, VMC, VM -> Follow Up Date.
// Rule: BD, VD -> Done Date.
export async function getSupervisorVisitsBooking(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const agentCondition = getAgentCondition(supervisorId, filterAgentId);
  const params: any[] = [...agentCondition.params];

  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ?";
    params.push(projectId);
  }

  // UPDATED: We now need 3 pairs of dates for the 3 distinct OR conditions
  // 1. Pipeline (follow_up_date)
  // 2. Success (done_date)
  // 3. Lost (updated_at)
  const fullParams = [
    ...params, 
    startDate, endDate, 
    startDate, endDate, 
    startDate, endDate
  ];

  const [rows]: any = await db.query(
    `
    SELECT status_code, COUNT(*) AS count
    FROM (
      SELECT ac.status_code
      FROM agent_customers ac
      JOIN customers c ON c.id = ac.customer_id
      WHERE 1=1 
      ${agentCondition.sql}
      ${projectFilter}
      AND (
        -- Scenario A: Pipeline Statuses (Based on Scheduled Follow Up Date)
        (
          ac.status_code IN (
            'visit-proposed', 'visit-confirmed', 
            'virtual-meet', 'virtual-meet-confirmed',
            'follow-up', 'sdow', 'not-reachable'
          )
          AND ac.follow_up_date IS NOT NULL
          AND DATE(ac.follow_up_date) BETWEEN ? AND ?
        )
        OR
        -- Scenario B: Success Statuses (Based on Done Date)
        (
          ac.status_code IN ('visit-done', 'booking-done')
          AND ac.done_date IS NOT NULL
          AND DATE(ac.done_date) BETWEEN ? AND ?
        )
        OR
        -- Scenario C: Lost Status (Based on Updated Date)
        (
          ac.status_code = 'lost'
          AND ac.updated_at IS NOT NULL
          AND DATE(ac.updated_at) BETWEEN ? AND ?
        )
      )
    ) t
    GROUP BY status_code
    `,
    fullParams
  );

  const result: Record<string, number> = {};
  rows.forEach((r: any) => (result[r.status_code] = r.count));
  return result;
}

// 2. PIPELINE DISCIPLINE (Matrix)
// Rule: Week starts Mon=1 (WEEKDAY + 1)
// Logic: Uses Logs to determine Fresh vs Repeated (Consistent with Agent Side)
export async function getSupervisorPipeline(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const agentCondition = getAgentCondition(supervisorId, filterAgentId);
  const params: any[] = [...agentCondition.params];

  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ? ";
    params.push(projectId);
  }

  // Add Date Params
  params.push(startDate, endDate);

  const [rows]: any = await db.query(
    `
    SELECT 
        ac.status_code,
        -- Alignment: MySQL WEEKDAY() is 0(Mon)-6(Sun). Add 1 to make it 1(Mon)-7(Sun).
        (WEEKDAY(ac.follow_up_date) + 1) AS day_num,
        
        -- FRESH LOGIC: Scheduled date is the SAME DAY it became that status (checked via logs)
        SUM(
            CASE 
                WHEN DATE(first_log.first_time) = DATE(ac.follow_up_date) THEN 1
                ELSE 0
            END
        ) AS fresh,

        -- REPEATED LOGIC: Scheduled date is AFTER the day it first became that status
        SUM(
            CASE 
                WHEN DATE(first_log.first_time) < DATE(ac.follow_up_date) THEN 1
                ELSE 0
            END
        ) AS repeated

    FROM agent_customers ac
    JOIN customers c ON c.id = ac.customer_id
    
    -- Join LOGS to calculate "First Time" dynamically
    JOIN (
        SELECT 
            agent_customer_id,
            JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.status_code')) AS status_code,
            MIN(created_at) AS first_time
        FROM agent_customer_logs
        WHERE action_type IN ('CREATE', 'EDIT', 'STATUS_CHANGE')
        GROUP BY agent_customer_id, JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.status_code'))
    ) first_log 
    ON first_log.agent_customer_id = ac.id 
    AND first_log.status_code = ac.status_code

    WHERE 1=1
      ${agentCondition.sql}
      ${projectFilter}
      AND ac.follow_up_date BETWEEN ? AND ?
      AND ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed')
    
    -- Group by CORRECTED day_num
    GROUP BY ac.status_code, day_num
    `,
    params
  );

  return rows;
}

// 3. TOTAL STATUS COUNTS (Matrix)
// Rule: BD/VD -> Done Date. Others -> Created/Assigned Date.
// Rule: Week starts Mon=1.
export async function getSupervisorStatusCounts(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const agentCondition = getAgentCondition(supervisorId, filterAgentId);
  const params: any[] = [...agentCondition.params];

  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ?";
    params.push(projectId);
  }

  // Add date params (Twice)
  params.push(startDate, endDate, startDate, endDate);

  const query = `
    SELECT 
        ac.status_code, 
        -- FIX: Use WEEKDAY() + 1. Mon=0 becomes 1. Sun=6 becomes 7.
        CASE 
            WHEN ac.status_code IN ('visit-done', 'booking-done') AND ac.done_date IS NOT NULL 
                THEN (WEEKDAY(ac.done_date) + 1)
            ELSE (WEEKDAY(ac.assigned_at) + 1) -- Use Assigned At for Input Volume
        END as day_num,
        COUNT(*) AS count
    FROM agent_customers ac
    JOIN customers c ON ac.customer_id = c.id
    WHERE ac.is_active = 1
      ${agentCondition.sql}
      ${projectFilter}
      AND (
        -- Logic: If Done/Booked, check Done Date
        (
          ac.status_code IN ('visit-done', 'booking-done') 
          AND ac.done_date BETWEEN ? AND ?
        )
        OR
        -- Logic: If anything else, check Assigned Date
        (
          ac.status_code NOT IN ('visit-done', 'booking-done') 
          AND ac.assigned_at BETWEEN ? AND ?
        )
      )
    GROUP BY ac.status_code, day_num
  `;

  const [rows]: any = await db.query(query, params);
  return rows;
}

export async function getSupervisorTeamFollowUps(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  status: string // 1. Add status argument
) {
  const params: any[] = [supervisorId];

  // Dynamic Filters
  let agentFilter = "";
  if (filterAgentId && filterAgentId !== "all") {
    agentFilter = " AND ac.agent_id = ? ";
    params.push(filterAgentId);
  }

  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ? "; 
    params.push(projectId);
  }

  // 2. Build Status Filter SQL
  let statusFilter = "";
  if (status && status !== "all") {
    statusFilter = " AND ac.status_code = ? ";
    params.push(status);
  }

  const query = `
    SELECT 
      ac.id AS agent_customer_id,
      c.name AS customer_name,      
      c.contact AS contact_number,   
      c.location,
      ac.status_code,
      ac.follow_up_date,
      ac.follow_up_time,
      TIMESTAMP(ac.follow_up_date, ac.follow_up_time) AS scheduled_at, 
      c.updated_at,
      ac.remark,
      p.name as project_name,
      CONCAT(u.first_name, ' ', u.last_name) as agent_name
    FROM agent_customers ac
    JOIN users u ON ac.agent_id = u.id
    JOIN customers c ON ac.customer_id = c.id    
    LEFT JOIN projects p ON c.project_id = p.id
    WHERE u.supervisor_id = ? 
      AND ac.is_active = 1
      AND ac.follow_up_date IS NOT NULL
      AND ac.status_code != 'lost'
      AND (ac.final_status != 'COMPLETED' OR ac.final_status IS NULL)
      ${agentFilter}
      ${projectFilter}
      ${statusFilter}  -- 3. Inject Status Filter
    ORDER BY ac.follow_up_date ASC, ac.follow_up_time ASC
  `;

  const [rows] = await db.query(query, params);
  return rows;
}

// NEW: Export Data Service
export async function getExportData(
  supervisorId: number,
  agentId: string,
  projectId: string,
  status: string,
  startDate: string,
  endDate: string
) {
  const params: any[] = [supervisorId];

  // 1. Base Query with DATE_FORMAT
  let sql = `
    SELECT 
      c.name AS customer_name,
      c.contact,
      c.location,
      c.pincode,
      c.profession,
      c.designation,
      
      -- FORMATTING DATES HERE (DD/MM/YYYY)
      DATE_FORMAT(c.created_at, '%d/%m/%Y') AS created_at, 
      DATE_FORMAT(c.updated_at, '%d/%m/%Y') AS updated_at,
      
      ac.source,
      ac.rating,
      ac.budget,
      ac.configuration,
      ac.purpose,
      ac.status_code,
      
      -- FORMATTING FOLLOW-UP & DONE DATES
      DATE_FORMAT(ac.follow_up_date, '%d/%m/%Y') AS follow_up_date,
      ac.follow_up_time,
      DATE_FORMAT(ac.done_date, '%d/%m/%Y') AS done_date,
      
      ac.remark,
      ac.final_status,
      p.name AS project_name,
      u.first_name AS agent_first_name,
      u.last_name AS agent_last_name,
      u.username AS agent_username
    FROM agent_customers ac
    JOIN customers c ON ac.customer_id = c.id
    LEFT JOIN projects p ON c.project_id = p.id
    JOIN users u ON ac.agent_id = u.id
    WHERE u.supervisor_id = ? 
  `;

  // 2. Apply Dynamic Filters
  
  if (agentId && agentId !== 'all') {
    sql += ` AND ac.agent_id = ?`;
    params.push(agentId);
  }

  if (projectId && projectId !== 'all') {
    sql += ` AND c.project_id = ?`;
    params.push(projectId);
  }

  if (status && status !== 'all') {
    sql += ` AND ac.status_code = ?`;
    params.push(status);
  }

  // Filter by Date Range (using raw updated_at for filtering, but selecting formatted)
  if (startDate && endDate) {
    sql += ` AND DATE(ac.updated_at) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  sql += ` ORDER BY ac.updated_at DESC`;

  const [rows] = await db.query(sql, params);
  return rows;
}