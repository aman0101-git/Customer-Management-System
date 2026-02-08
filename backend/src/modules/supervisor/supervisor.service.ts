import { db } from "../../config/db.js";

// Helper: Get SQL condition to filter by Agents
// If filterAgentId is "all", it selects ALL agents under this supervisor.
// If filterAgentId is specific, it validates that the agent belongs to this supervisor.

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

// 1. Get List of Agents for the Dropdown
export async function getAssociates(supervisorId: number) {
  const [rows]: any = await db.query(
    "SELECT id, CONCAT(first_name, ' ', last_name) as name FROM users WHERE supervisor_id = ? AND is_active = 1",
    [supervisorId]
  );
  return rows;
}

// 2. Section 1: Visits & Bookings (Cards)
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

  // Double the params for the two date checks in SQL
  const fullParams = [...params, startDate, endDate, startDate, endDate];

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
        -- Scenario A: Active Statuses (Based on Assignment Date)
        (
          ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet', 'virtual-meet-confirmed')
          AND DATE(ac.assigned_at) BETWEEN ? AND ?
        )
        OR
        -- Scenario B: Done Statuses (Based on Done Date)
        (
          ac.status_code IN ('visit-done','booking-done','lost')
          AND ac.done_date IS NOT NULL
          AND ac.done_date BETWEEN ? AND ?
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

// 3. Section 2: Pipeline Discipline (Matrix)
export async function getSupervisorPipeline(
  supervisorId: number,
  filterAgentId: string,
  projectId: string, // <--- NEW ARGUMENT
  startDate: string,
  endDate: string
) {
  const agentCondition = getAgentCondition(supervisorId, filterAgentId);
  const params: any[] = [...agentCondition.params];

  // NEW: Add Project Filter Logic
  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ? ";
    params.push(projectId);
  }

  // Add Date Params at the end
  params.push(startDate, endDate);

  const [rows]: any = await db.query(
    `
    SELECT 
        ac.status_code,
        DAYOFWEEK(ac.follow_up_date) AS day_num,
        SUM(CASE WHEN DATE(first_log.first_time) = DATE(ac.follow_up_date) THEN 1 ELSE 0 END) AS fresh,
        SUM(CASE WHEN DATE(first_log.first_time) < DATE(ac.follow_up_date) THEN 1 ELSE 0 END) AS repeated
    FROM agent_customers ac
    JOIN customers c ON c.id = ac.customer_id  -- <--- NEW JOIN to check Project
    JOIN (
        SELECT 
            agent_customer_id,
            JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.status_code')) AS status_code,
            MIN(created_at) AS first_time
        FROM agent_customer_logs
        WHERE action_type IN ('CREATE', 'EDIT', 'STATUS_CHANGE')
        GROUP BY agent_customer_id, JSON_UNQUOTE(JSON_EXTRACT(new_value, '$.status_code'))
    ) first_log 
    ON first_log.agent_customer_id = ac.id AND first_log.status_code = ac.status_code
    WHERE 1=1
      ${agentCondition.sql}
      ${projectFilter}  -- <--- APPLY FILTER
      AND ac.follow_up_date BETWEEN ? AND ?
      AND ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed')
    GROUP BY ac.status_code, DAYOFWEEK(ac.follow_up_date)
    `,
    params
  );

  return rows;
}

// 4. Section 3: Total Status Counts (Matrix)
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

  // Add date params
  params.push(startDate, endDate, startDate, endDate);

  const query = `
    SELECT 
        ac.status_code, 
        CASE 
            WHEN ac.status_code IN ('visit-done', 'booking-done') AND ac.done_date IS NOT NULL 
                THEN DAYOFWEEK(ac.done_date)
            ELSE DAYOFWEEK(c.updated_at)
        END as day_num,
        COUNT(*) AS count
    FROM agent_customers ac
    JOIN customers c ON ac.customer_id = c.id
    WHERE ac.is_active = 1
      ${agentCondition.sql}
      ${projectFilter}
      AND (
        (ac.status_code IN ('visit-done', 'booking-done') AND ac.done_date BETWEEN ? AND ?)
        OR
        (ac.status_code NOT IN ('visit-done', 'booking-done') AND c.updated_at BETWEEN ? AND ?)
      )
    GROUP BY ac.status_code, day_num
  `;

  const [rows]: any = await db.query(query, params);
  return rows;
}

// 5. Follow-up Discipline: Fetch Team Follow-ups
export async function getSupervisorTeamFollowUps(
  supervisorId: number,
  filterAgentId: string,
  projectId: string
) {
  // Base params
  const params: any[] = [supervisorId];

  // Dynamic Filters
  let agentFilter = "";
  if (filterAgentId && filterAgentId !== "all") {
    agentFilter = " AND ac.agent_id = ? ";
    params.push(filterAgentId);
  }

  let projectFilter = "";
  if (projectId && projectId !== "all") {
    // Note: Filtering by the project assigned in the tracking table
    projectFilter = " AND ac.project_id = ? ";
    params.push(projectId);
  }

  // LOGIC FIXES:
  // 1. Join 'customers' (c) to get name/contact.
  // 2. Select c.name/c.contact explicitly.
  // 3. Apply strict filters: is_active=1, status!='lost', final_status!='COMPLETED'.
  
  const query = `
    SELECT 
      ac.id AS agent_customer_id,
      c.name AS customer_name,      
      c.contact AS contact_number,  
      c.location,
      ac.status_code,
      ac.follow_up_date,
      ac.follow_up_time,
      c.updated_at,
      ac.remark,
      p.name as project_name,
      CONCAT(u.first_name, ' ', u.last_name) as agent_name
    FROM agent_customers ac
    JOIN users u ON ac.agent_id = u.id
    JOIN customers c ON ac.customer_id = c.id    -- Fixed: JOIN added
    LEFT JOIN projects p ON c.project_id = p.id
    WHERE u.supervisor_id = ? 
      AND ac.is_active = 1
      AND ac.follow_up_date IS NOT NULL
      AND ac.status_code != 'lost'
      AND (ac.final_status != 'COMPLETED' OR ac.final_status IS NULL)
      ${agentFilter}
      ${projectFilter}
    ORDER BY ac.follow_up_date ASC, ac.follow_up_time ASC
  `;

  const [rows] = await db.query(query, params);
  return rows;
}