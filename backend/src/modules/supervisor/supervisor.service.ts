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
// Rule: VC, VP, VMC, VM, Follow Up, SDOW, Not Reachable, Lost -> Updated Date.
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

  // UPDATED: We now only need 2 pairs of dates for the 2 distinct OR conditions
  // 1. Actioned/Updated Statuses (updated_at)
  // 2. Success Statuses (done_date)
  const fullParams = [
    ...params, 
    startDate, endDate, // For Scenario A
    startDate, endDate  // For Scenario B
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
        -- Scenario A: Actioned Statuses & Lost (Based on Updated Date)
        (
          ac.status_code IN (
            'visit-proposed', 'visit-confirmed', 
            'virtual-meet', 'virtual-meet-confirmed',
            'follow-up', 'sdow', 'not-reachable', 'lost'
          )
          AND ac.updated_at IS NOT NULL
          AND DATE(ac.updated_at) BETWEEN ? AND ?
        )
        OR
        -- Scenario B: Success Statuses (Based on Done Date)
        (
          ac.status_code IN ('visit-done', 'booking-done')
          AND ac.done_date IS NOT NULL
          AND DATE(ac.done_date) BETWEEN ? AND ?
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
// Logic: "Reset Clock" - Counts DISTINCT follow-up dates strictly AFTER the most recent status change
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

  params.push(startDate, endDate);

  const [rows]: any = await db.query(
    `
    SELECT 
        ac.status_code,
        (WEEKDAY(ac.follow_up_date) + 1) AS day_num,
        
        SUM(
            CASE 
                WHEN IFNULL(followup_history.unique_dates, 1) <= 1 THEN 1
                ELSE 0
            END
        ) AS fresh,

        SUM(
            CASE 
                WHEN followup_history.unique_dates > 1 THEN 1
                ELSE 0
            END
        ) AS repeated

    FROM agent_customers ac
    JOIN customers c ON c.id = ac.customer_id
    
    LEFT JOIN (
        SELECT 
            acl.agent_customer_id, 
            COUNT(DISTINCT DATE(JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')))) AS unique_dates
        FROM agent_customer_logs acl
        JOIN (
            SELECT 
                agent_customer_id, 
                MAX(created_at) AS last_status_change_at
            FROM agent_customer_logs
            WHERE action_type IN ('CREATE', 'STATUS_CHANGE')
            GROUP BY agent_customer_id
        ) latest_status ON acl.agent_customer_id = latest_status.agent_customer_id 
                        AND acl.created_at >= latest_status.last_status_change_at
        
        WHERE JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')) IS NOT NULL
          AND JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')) != ''
        GROUP BY acl.agent_customer_id
    ) followup_history ON followup_history.agent_customer_id = ac.id 

    WHERE 1=1
      ${agentCondition.sql}
      ${projectFilter}
      AND ac.follow_up_date BETWEEN ? AND ?
      AND ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed')
    
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
          AND DATE(ac.done_date) BETWEEN ? AND ?  -- ADDED DATE() HERE
        )
        OR
        -- Logic: If anything else, check Assigned Date
        (
          ac.status_code NOT IN ('visit-done', 'booking-done') 
          AND DATE(ac.assigned_at) BETWEEN ? AND ? -- ADDED DATE() HERE
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
      u.first_name AS agent_first_name,
      ac.status_code,
      ac.follow_up_date,
      ac.follow_up_time,
      ac.d3_sent,
      ac.d1_sent,
      ac.followup_msg_sent,
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

// NEW: Export Data Service with Full Journey History
export async function getExportData(
  supervisorId: number,
  agentId: string,
  projectId: string,
  status: string,
  startDate: string,
  endDate: string,
  mode: string = 'all'
) {
  const params: any[] = [supervisorId];

  let sql = `
    SELECT 
      ac.id AS agent_customer_id, -- Added to fetch logs later
      c.name AS customer_name,
      c.contact,
      c.location,
      c.pincode,
      c.profession,
      c.designation,
      
      c.created_at, 
      c.updated_at,
      
      ac.source,
      ac.rating,
      ac.budget,
      ac.configuration,
      ac.purpose,
      ac.status_code,
      
      ac.follow_up_date,
      ac.follow_up_time,
      ac.done_date,
      
      ac.remark,
      ac.final_status,
      p.name AS project_name,
      u.first_name AS agent_first_name,
      u.last_name AS agent_last_name,
      u.username AS agent_username,

      CASE 
          WHEN ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed') THEN
              IF(IFNULL(followup_history.unique_dates, 1) <= 1, 'Fresh', 'Repeated')
          ELSE 'N/A'
      END AS pipeline_lead_type

    FROM agent_customers ac
    JOIN customers c ON ac.customer_id = c.id
    LEFT JOIN projects p ON c.project_id = p.id
    JOIN users u ON ac.agent_id = u.id

    LEFT JOIN (
        SELECT 
            acl.agent_customer_id, 
            COUNT(DISTINCT DATE(JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')))) AS unique_dates
        FROM agent_customer_logs acl
        JOIN (
            SELECT 
                agent_customer_id, 
                MAX(created_at) AS last_status_change_at
            FROM agent_customer_logs
            WHERE action_type IN ('CREATE', 'STATUS_CHANGE')
            GROUP BY agent_customer_id
        ) latest_status ON acl.agent_customer_id = latest_status.agent_customer_id 
                        AND acl.created_at >= latest_status.last_status_change_at
        
        WHERE JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')) IS NOT NULL
          AND JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')) != ''
        GROUP BY acl.agent_customer_id
    ) followup_history ON followup_history.agent_customer_id = ac.id 

    WHERE u.supervisor_id = ? 
  `;

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

  if (startDate && endDate) {
    if (['visit-done', 'booking-done'].includes(status)) {
        sql += ` AND DATE(ac.done_date) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    } else if (status && status !== 'all') {
        sql += ` AND DATE(ac.updated_at) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    } else {
        sql += ` AND (
            (ac.status_code IN ('visit-done', 'booking-done') AND DATE(ac.done_date) BETWEEN ? AND ?)
            OR
            (ac.status_code NOT IN ('visit-done', 'booking-done') AND DATE(ac.updated_at) BETWEEN ? AND ?)
        )`;
        params.push(startDate, endDate, startDate, endDate);
    }
  }

  if (mode === 'fresh') {
      sql += ` AND ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed') AND IFNULL(followup_history.unique_dates, 1) <= 1 `;
  } else if (mode === 'repeated') {
      sql += ` AND ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed') AND followup_history.unique_dates > 1 `;
  }

  sql += ` ORDER BY ac.updated_at DESC`;

  const [rows]: any = await db.query(sql, params);

  // Return early if no data
  if (rows.length === 0) return rows;

  // --- NEW: FETCH AND FORMAT HISTORY LOGS ---
  const customerIds = rows.map((r: any) => r.agent_customer_id);
  
  const [logRows]: any = await db.query(
    `SELECT agent_customer_id, created_at, action_type, old_value, new_value 
     FROM agent_customer_logs 
     WHERE agent_customer_id IN (?) 
     ORDER BY created_at ASC`,
    [customerIds]
  );

  const historyMap: Record<number, string[]> = {};

  logRows.forEach((log: any) => {
    let newVal: any = {};
    let oldVal: any = {};
    try { newVal = log.new_value ? JSON.parse(log.new_value) : {}; } catch(e){}
    try { oldVal = log.old_value ? JSON.parse(log.old_value) : {}; } catch(e){}

    // Skip blank edits
    if (log.action_type !== 'CREATE' && log.action_type !== 'STATUS_CHANGE' && (!newVal.remark || newVal.remark.trim() === '')) {
      return; 
    }

    const dateStr = new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    let entry = `[${dateStr}] ${log.action_type}`;

    if (log.action_type === 'STATUS_CHANGE') {
        entry += ` (${oldVal.status_code || 'none'} -> ${newVal.status_code || 'none'})`;
    } else if (log.action_type === 'CREATE') {
        entry += ` (Initial: ${newVal.status_code || 'none'})`;
    }

    if (newVal.remark && newVal.remark.trim() !== '') {
        entry += ` | Remark: "${newVal.remark}"`;
    }

    if (!historyMap[log.agent_customer_id]) {
      historyMap[log.agent_customer_id] = [];
    }
    historyMap[log.agent_customer_id].push(entry);
  });

  // Attach compiled history string to the final rows
  const finalExportRows = rows.map((row: any) => ({
    ...row,
    full_history: historyMap[row.agent_customer_id] 
      ? historyMap[row.agent_customer_id].join('\n') 
      : 'No history recorded'
  }));

  return finalExportRows;
}

// --- DRILL DOWN FUNCTION FOR SUPERVISOR ---
export async function getSupervisorDrillDown(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string,
  statusCode: string,
  section: string, // 'cards', 'pipeline', 'volume'
  dayNum?: number,
  mode?: string // NEW: 'all', 'fresh', 'repeated'
) {
  const agentCondition = getAgentCondition(supervisorId, filterAgentId);
  const params: any[] = [...agentCondition.params];

  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ? ";
    params.push(projectId);
  }

  let whereClause = "";
  let orderByCol = "ac.updated_at"; 

  if (statusCode !== 'all') {
    let dateCol = "ac.updated_at";

    // UPDATED: Cards logic simplified to match the new updated_at rule
    if (section === 'cards') {
        if (['visit-done', 'booking-done'].includes(statusCode)) {
            dateCol = "ac.done_date";
        } else {
            dateCol = "ac.updated_at"; // All other statuses fall back to updated_at
        }
    } 
    else if (section === 'pipeline') {
        dateCol = "ac.follow_up_date";
    } 
    else if (section === 'volume') {
        if (['visit-done', 'booking-done'].includes(statusCode)) dateCol = "ac.done_date";
        else dateCol = "ac.assigned_at";
    }

    params.push(startDate, endDate);
    whereClause = ` AND DATE(${dateCol}) BETWEEN ? AND ? AND ac.status_code = ? `;
    params.push(statusCode);
    
    if (dayNum) {
        whereClause += ` AND (WEEKDAY(${dateCol}) + 1) = ? `;
        params.push(dayNum);
    }
    orderByCol = dateCol;
  } 
  else {
    if (section === 'pipeline') {
        const pipelineStatuses = "'visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed'";
        
        whereClause = ` 
            AND ac.status_code IN (${pipelineStatuses})
            AND DATE(ac.follow_up_date) BETWEEN ? AND ? 
        `; 
        params.push(startDate, endDate);
        
        if (dayNum) {
            whereClause += ` AND (WEEKDAY(ac.follow_up_date) + 1) = ? `;
            params.push(dayNum);
        }
        orderByCol = "ac.follow_up_date";
    } 
    else if (section === 'volume') {
        whereClause = `
            AND (
                (ac.status_code IN ('visit-done', 'booking-done') AND DATE(ac.done_date) BETWEEN ? AND ?)
                OR
                (ac.status_code NOT IN ('visit-done', 'booking-done') AND DATE(ac.assigned_at) BETWEEN ? AND ?)
            )
        `; 
        params.push(startDate, endDate, startDate, endDate);

        if (dayNum) {
            whereClause += `
                AND (
                    CASE 
                        WHEN ac.status_code IN ('visit-done', 'booking-done') THEN (WEEKDAY(ac.done_date) + 1)
                        ELSE (WEEKDAY(ac.assigned_at) + 1)
                    END
                ) = ?
            `;
            params.push(dayNum);
        }
        orderByCol = "ac.assigned_at"; 
    }
  }

  // FIX: Unconditionally apply the Lead Type calculation so it shows up in ALL drill down views
  const pipelineLeadTypeCol = `
      CASE 
          WHEN ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed') THEN
              IF(IFNULL(followup_history.unique_dates, 1) <= 1, 'Fresh', 'Repeated')
          ELSE 'N/A'
      END AS pipeline_lead_type
  `;

  // FIX: Unconditionally apply the Reset Clock join
  const dynamicJoin = `
    LEFT JOIN (
        SELECT 
            acl.agent_customer_id, 
            COUNT(DISTINCT DATE(JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')))) AS unique_dates
        FROM agent_customer_logs acl
        JOIN (
            SELECT 
                agent_customer_id, 
                MAX(created_at) AS last_status_change_at
            FROM agent_customer_logs
            WHERE action_type IN ('CREATE', 'STATUS_CHANGE')
            GROUP BY agent_customer_id
        ) latest_status ON acl.agent_customer_id = latest_status.agent_customer_id 
                        AND acl.created_at >= latest_status.last_status_change_at
        
        WHERE JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')) IS NOT NULL
          AND JSON_UNQUOTE(JSON_EXTRACT(acl.new_value, '$.follow_up_date')) != '' 
        GROUP BY acl.agent_customer_id
    ) followup_history ON followup_history.agent_customer_id = ac.id
  `;

  // Keep the mode filtering (only applies when the frontend explicitly passes 'fresh' or 'repeated')
  if (mode === 'fresh') {
      whereClause += ` AND IFNULL(followup_history.unique_dates, 1) <= 1 `;
  } else if (mode === 'repeated') {
      whereClause += ` AND followup_history.unique_dates > 1 `;
  }

  const sql = `
    SELECT 
      c.name AS customer_name,
      c.contact AS contact,
      ac.status_code,
      ac.follow_up_date,
      ac.follow_up_time,
      ac.done_date,
      ac.assigned_at,
      p.name AS project_name,
      CONCAT(u.first_name, ' ', u.last_name) AS agent_name,
      ${pipelineLeadTypeCol}
    FROM agent_customers ac
    JOIN customers c ON c.id = ac.customer_id
    LEFT JOIN projects p ON p.id = c.project_id
    JOIN users u ON u.id = ac.agent_id
    
    ${dynamicJoin}
    
    WHERE 1=1
      ${agentCondition.sql}
      ${projectFilter}
      ${whereClause}
    ORDER BY ${orderByCol} DESC
    LIMIT 200
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}

// --- UPDATED GLOBAL SEARCH FUNCTION (EXACT 10-DIGIT CONTACT) ---
export async function searchGlobalCustomers(contactNumber: string) {
  const query = `
    SELECT 
      c.id AS customer_id,
      c.name AS customer_name,
      c.contact,
      ac.status_code,
      ac.follow_up_date,
      ac.follow_up_time,
      p.name AS project_name,
      CONCAT(u.first_name, ' ', u.last_name) AS agent_name
    FROM customers c
    -- Join active assignments
    LEFT JOIN agent_customers ac ON c.id = ac.customer_id AND ac.is_active = 1
    -- Join project details
    LEFT JOIN projects p ON c.project_id = p.id
    -- Join agent details
    LEFT JOIN users u ON ac.agent_id = u.id
    WHERE c.contact = ? 
    ORDER BY c.updated_at DESC
  `;

  // Pass the exact string directly without wildcards
  const [rows] = await db.query(query, [contactNumber]);
  return rows;
}

// --- NEW: SOFT TRANSFER REASSIGNMENT TRANSACTION ---
export async function reassignCustomerTransaction(
  customerId: number,
  newAgentId: number,
  newProjectId: number,
  supervisorId: number
) {
  // 1. Get a dedicated connection from the pool for the transaction
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: Update the global Customer Project
    await connection.query(
      `UPDATE customers SET project_id = ? WHERE id = ?`,
      [newProjectId, customerId]
    );

    // Step 2: Find the currently active assignment (to close it)
    const [oldAssignments]: any = await connection.query(
      `SELECT * FROM agent_customers WHERE customer_id = ? AND is_active = 1`,
      [customerId]
    );
    const oldAssignment = oldAssignments[0];

    // Step 3: Close the old assignment
    if (oldAssignment) {
      // If the old agent is exactly the same as the new agent, we don't need to close it!
      if (oldAssignment.agent_id === newAgentId) {
         await connection.commit();
         // ✅ FIX: Removed connection.release() from here. 
         // The finally block at the bottom will automatically release it when we return!
         return true; 
      }

      await connection.query(
        `UPDATE agent_customers SET is_active = 0, status_code = 'transferred' WHERE id = ?`,
        [oldAssignment.id]
      );
    }

    // Step 4: Open the new assignment (Handles Unique Key Constraint)
    // We copy over basic static info (budget, purpose) but reset the status and dates.
    const [newResult]: any = await connection.query(
      `INSERT INTO agent_customers 
        (agent_id, customer_id, source, rating, budget, configuration, purpose, status_code, remark, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'Transferred by Supervisor', 1)
       ON DUPLICATE KEY UPDATE 
        is_active = 1, 
        status_code = 'pending',
        follow_up_date = NULL,
        follow_up_time = NULL,
        done_date = NULL,
        assigned_at = CURRENT_TIMESTAMP`,
      [
        newAgentId,
        customerId,
        oldAssignment?.source || null,
        oldAssignment?.rating || 'Cold',
        oldAssignment?.budget || null,
        oldAssignment?.configuration || null,
        oldAssignment?.purpose || null
      ]
    );

    // Get the ID of the new (or updated) row
    let newAgentCustomerId = newResult.insertId;
    if (newAgentCustomerId === 0) {
      // If it updated an existing row, insertId is 0, so we manually fetch it
      const [existingRow]: any = await connection.query(
        `SELECT id FROM agent_customers WHERE agent_id = ? AND customer_id = ?`,
        [newAgentId, customerId]
      );
      newAgentCustomerId = existingRow[0].id;
    }

    // Step 5: Create the Audit Log
    const oldVal = oldAssignment 
      ? JSON.stringify({ agent_id: oldAssignment.agent_id, project_id: oldAssignment.project_id }) 
      : null;
    const newVal = JSON.stringify({ agent_id: newAgentId, project_id: newProjectId });

    await connection.query(
      `INSERT INTO agent_customer_logs 
       (agent_customer_id, agent_id, action_type, old_value, new_value) 
       VALUES (?, ?, 'EDIT', ?, ?)`,
      [newAgentCustomerId, supervisorId, oldVal, newVal]
    );

    // Commit all changes
    await connection.commit();
    return true;

  } catch (error) {
    // If ANY query fails, rollback the entire transaction
    await connection.rollback();
    throw error;
  } finally {
    // ✅ This block is guaranteed to run, safely returning the connection to the pool exactly once.
    connection.release();
  }
}

// =============================================================================
// WHATSAPP AUDIT LOG (NEW: Profile-Centric Workflow)
// =============================================================================

/**
 * Get WhatsApp audit log for supervisor (messages sent by their agents)
 */
export async function getWhatsAppAuditLog(
  supervisorId: number,
  filterAgentId?: number,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  let query = `
    SELECT 
      wml.id,
      wml.created_at as sent_at,
      wml.status,
      u.first_name,
      u.last_name,
      c.name as customer_name,
      c.contact as phone,
      p.name as project_name,
      wt.template_code,
      wml.delivery_mode,
      wml.message_preview,
      wml.provider_message_id,
      wml.error_code,
      wml.error_message,
      wml.request_payload,
      wml.response_payload
    FROM whatsapp_message_logs wml
    JOIN users u ON wml.agent_id = u.id
    JOIN customers c ON wml.customer_id = c.id
    JOIN projects p ON wml.project_id = p.id
    LEFT JOIN whatsapp_templates wt ON wml.template_id = wt.id
    WHERE u.supervisor_id = ?
  `;
  
  const params: any[] = [supervisorId];

  // Filter by agent if specified
  if (filterAgentId) {
    query += ` AND wml.agent_id = ?`;
    params.push(filterAgentId);
  }

  // Filter by date range
  if (startDate) {
    query += ` AND DATE(wml.created_at) >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND DATE(wml.created_at) <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY wml.created_at DESC`;

  const [rows]: any = await db.query(query, params);
  
  return rows.map((row: any) => ({
    ...row,
    agent_name: `${row.first_name} ${row.last_name}`,
    sent_at: row.sent_at,
  }));
}