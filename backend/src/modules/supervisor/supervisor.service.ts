// ============================================================================
// backend/src/modules/supervisor/supervisor.service.ts
// ----------------------------------------------------------------------------
// Production optimization (May 2026):
//   1. IN (SELECT id FROM users WHERE supervisor_id = ?) → JOIN users u.
//      Index idx_users_super_role_active makes this an O(log n) lookup
//      instead of a correlated subquery.
//   2. DATE(col) BETWEEN → sargable col >= ? AND col < ?+1day.
//   3. Fresh/Repeated JSON_EXTRACT subquery removed — reads
//      ac.distinct_followup_dates instead.
//   4. getSupervisorTeamFollowUps: LIMIT 5000 safety cap.
//   5. getWhatsAppAuditLog: pagination, default 30-day window, hard cap 1000.
//   6. getExportData: chunked log fetch + LIMIT 50000.
// ============================================================================

import { db } from "../../config/db.js";

// Sargable date range helper
function dateRange(col: string): string {
  return `${col} >= ? AND ${col} < DATE_ADD(?, INTERVAL 1 DAY)`;
}

// ----------------------------------------------------------------------------
// LOOKUPS
// ----------------------------------------------------------------------------

export async function getSupervisorProjects(supervisorId: number) {
  const [rows]: any = await db.query(
    `SELECT id, name FROM projects
      WHERE created_by = ? AND is_active = 1
      ORDER BY created_at DESC`,
    [supervisorId]
  );
  return rows;
}

export async function getAssociates(supervisorId: number) {
  const [rows]: any = await db.query(
    `SELECT id, CONCAT(first_name,' ',last_name) AS name
       FROM users
      WHERE supervisor_id = ? AND is_active = 1
      ORDER BY first_name`,
    [supervisorId]
  );
  return rows;
}

// ----------------------------------------------------------------------------
// DASHBOARD: VISITS & BOOKINGS  (cards)
// ----------------------------------------------------------------------------
export async function getSupervisorVisitsBooking(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const params: any[] = [supervisorId];
  let agentFilter = "";
  if (filterAgentId && filterAgentId !== "all") {
    agentFilter = " AND ac.agent_id = ? ";
    params.push(filterAgentId);
  }
  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ?";
    params.push(projectId);
  }
  params.push(startDate, endDate, startDate, endDate);

  const [rows]: any = await db.query(
    `SELECT status_code, COUNT(*) AS count
       FROM (
         SELECT ac.status_code
           FROM agent_customers ac
           JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
           JOIN customers c ON c.id = ac.customer_id
          WHERE 1=1
            ${agentFilter}
            ${projectFilter}
            AND (
              ( ac.status_code IN ('visit-proposed','visit-confirmed','ringing','virtual-meet-confirmed','follow-up','sdow','not-reachable','lost')
                AND ac.updated_at IS NOT NULL AND ${dateRange("ac.updated_at")} )
              OR
              ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done')
                AND ac.done_date IS NOT NULL AND ${dateRange("ac.done_date")} )
            )
       ) t
      GROUP BY status_code`,
    params
  );

  const out: Record<string, number> = {};
  rows.forEach((r: any) => (out[r.status_code] = r.count));
  return out;
}

// ----------------------------------------------------------------------------
// DASHBOARD: PIPELINE (Fresh vs Repeated)  — NO JSON SCAN
// ----------------------------------------------------------------------------
export async function getSupervisorPipeline(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const params: any[] = [supervisorId];
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
  params.push(startDate, endDate);

  const [rows]: any = await db.query(
    `SELECT ac.status_code,
            (WEEKDAY(ac.follow_up_date) + 1) AS day_num,
            SUM(CASE WHEN IFNULL(ac.distinct_followup_dates,1) <= 1 THEN 1 ELSE 0 END) AS fresh,
            SUM(CASE WHEN ac.distinct_followup_dates > 1 THEN 1 ELSE 0 END) AS repeated
       FROM agent_customers ac
       JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
       JOIN customers c ON c.id = ac.customer_id
      WHERE 1=1
        ${agentFilter}
        ${projectFilter}
        AND ${dateRange("ac.follow_up_date")}
        AND ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed')
      GROUP BY ac.status_code, day_num`,
    params
  );
  return rows;
}

// ----------------------------------------------------------------------------
// DASHBOARD: TOTAL STATUS COUNTS  (volume matrix)
// ----------------------------------------------------------------------------
export async function getSupervisorStatusCounts(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const params: any[] = [supervisorId];
  let agentFilter = "";
  if (filterAgentId && filterAgentId !== "all") {
    agentFilter = " AND ac.agent_id = ? ";
    params.push(filterAgentId);
  }
  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ?";
    params.push(projectId);
  }
  params.push(startDate, endDate, startDate, endDate);

  const [rows]: any = await db.query(
    `SELECT ac.status_code,
            CASE
              WHEN ac.status_code IN ('visit-done','booking-done','virtual-meet-done') AND ac.done_date IS NOT NULL
                THEN (WEEKDAY(ac.done_date) + 1)
              ELSE (WEEKDAY(ac.assigned_at) + 1)
            END AS day_num,
            COUNT(*) AS count
       FROM agent_customers ac
       JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
       JOIN customers c ON c.id = ac.customer_id
      WHERE ac.is_active = 1
        ${agentFilter}
        ${projectFilter}
        AND (
          ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.done_date")} )
          OR
          ( ac.status_code NOT IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.assigned_at")} )
        )
      GROUP BY ac.status_code, day_num`,
    params
  );
  return rows;
}

// ----------------------------------------------------------------------------
// TEAM FOLLOW-UPS  (capped, indexed)
// ----------------------------------------------------------------------------
export async function getSupervisorTeamFollowUps(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  status: string
) {
  const params: any[] = [supervisorId];
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
  let statusFilter = "";
  if (status && status !== "all") {
    statusFilter = " AND ac.status_code = ? ";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT ac.id AS agent_customer_id,
            c.name AS customer_name,
            c.contact AS contact_number,
            c.location,
            u.first_name AS agent_first_name,
            u.last_name AS agent_last_name,
            ac.status_code, ac.follow_up_date, ac.follow_up_time,
            CASE WHEN ac.follow_up_time IS NOT NULL
                 THEN TIMESTAMP(ac.follow_up_date, ac.follow_up_time)
                 ELSE CAST(ac.follow_up_date AS DATETIME)
            END AS scheduled_at,
            c.updated_at,
            ac.remark,
            p.name AS project_name,
            u.first_name AS agent_name
       FROM agent_customers ac
       JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
       JOIN customers c ON c.id = ac.customer_id
       LEFT JOIN projects p ON c.project_id = p.id
      WHERE ac.is_active = 1
        AND ac.follow_up_date IS NOT NULL
        AND ac.status_code <> 'lost'
        AND (ac.final_status <> 'COMPLETED' OR ac.final_status IS NULL)
        ${agentFilter}
        ${projectFilter}
        ${statusFilter}
      ORDER BY ac.follow_up_date ASC, ac.follow_up_time ASC
      LIMIT 5000`,
    params
  );
  return rows;
}

// ----------------------------------------------------------------------------
// EXPORT  — no JSON scan; chunked log fetch
// ----------------------------------------------------------------------------
// Phase 6: Parse a query-string value that may be a single id, "all", a
// comma-separated list of ids, or already an array. Returns either:
//   - the literal string "all" (means "no filter, include everything")
//   - a string[] of one-or-more ids ready for an IN(?) binding
// Backward compatibility: a single value like "12" turns into ["12"], which
// the SQL builder still handles correctly via IN(?).
function parseMultiFilter(raw: string | string[] | undefined): "all" | string[] {
  if (raw === undefined || raw === null) return "all";
  const list = (Array.isArray(raw) ? raw : String(raw).split(","))
    .map(v => String(v).trim())
    .filter(v => v.length > 0);
  if (list.length === 0 || list.includes("all")) return "all";
  return list;
}

export async function getExportData(
  supervisorId: number,
  agentId: string | string[],
  projectId: string | string[],
  status: string | string[],
  startDate: string,
  endDate: string,
  mode: string = 'all'
) {
  const params: any[] = [supervisorId];

  // Phase 6: parse all three filters into either "all" or a list. Backward
  // compatible with single-value callers; the singleton case binds via IN(?).
  const agentFilter   = parseMultiFilter(agentId);
  const projectFilter = parseMultiFilter(projectId);
  const statusFilter  = parseMultiFilter(status);

  let sql = `
    SELECT
      ac.id AS agent_customer_id,
      c.name AS customer_name, c.contact, c.location, c.pincode, c.profession, c.designation,
      c.created_at, c.updated_at,
      ac.source, ac.rating, ac.budget, ac.configuration, ac.purpose, ac.status_code,
      ac.follow_up_date, ac.follow_up_time, ac.done_date,
      ac.remark, ac.final_status,
      p.name AS project_name,
      u.first_name AS agent_first_name, u.last_name AS agent_last_name, u.username AS agent_username,
      CASE
        WHEN ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed') THEN
          IF(IFNULL(ac.distinct_followup_dates,1) <= 1, 'Fresh', 'Repeated')
        ELSE 'N/A'
      END AS pipeline_lead_type
    FROM agent_customers ac
    JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
    JOIN customers c ON c.id = ac.customer_id
    LEFT JOIN projects p ON c.project_id = p.id
    WHERE 1=1
  `;

  if (agentFilter !== "all") {
    sql += " AND ac.agent_id IN (?)";
    params.push(agentFilter);
  }
  if (projectFilter !== "all") {
    sql += " AND c.project_id IN (?)";
    params.push(projectFilter);
  }
  if (statusFilter !== "all") {
    sql += " AND ac.status_code IN (?)";
    params.push(statusFilter);
  }

  if (startDate && endDate) {
    // Phase 6: when ANY non-"done" / "booking-done" code is included in the
    // status filter list, we still need the OR branch for the closed-codes.
    const DONE_STATUSES = ["visit-done", "booking-done", "virtual-meet-done"];
    const statusIsClosedOnly =
      statusFilter !== "all" &&
      statusFilter.every(s => DONE_STATUSES.includes(s));
    const statusIsActiveOnly =
      statusFilter !== "all" &&
      !statusFilter.some(s => DONE_STATUSES.includes(s));

    if (statusIsClosedOnly) {
      sql += ` AND ${dateRange("ac.done_date")}`;
      params.push(startDate, endDate);
    } else if (statusIsActiveOnly) {
      sql += ` AND ${dateRange("ac.updated_at")}`;
      params.push(startDate, endDate);
    } else {
      sql += ` AND (
        ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.done_date")} )
        OR
        ( ac.status_code NOT IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.updated_at")} )
      )`;
      params.push(startDate, endDate, startDate, endDate);
    }
  }

  if (mode === 'fresh') {
    sql += " AND ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed') AND IFNULL(ac.distinct_followup_dates,1) <= 1 ";
  } else if (mode === 'repeated') {
    sql += " AND ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed') AND ac.distinct_followup_dates > 1 ";
  }

  sql += " ORDER BY ac.updated_at DESC LIMIT 50000";

  const [rows]: any = await db.query(sql, params);
  if (rows.length === 0) return rows;

  // ---- Fetch logs in safe chunks (mysql2's IN-binding caps around 65K params) ----
  const ids: number[] = rows.map((r: any) => r.agent_customer_id);
  const CHUNK = 1000;
  const logRowsAll: any[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const [logRows]: any = await db.query(
      `SELECT agent_customer_id, created_at, action_type, old_value, new_value
         FROM agent_customer_logs
        WHERE agent_customer_id IN (?)
        ORDER BY agent_customer_id, created_at ASC`,
      [chunk]
    );
    for (const r of logRows) logRowsAll.push(r);
  }

  const historyMap: Record<number, string[]> = {};
  for (const log of logRowsAll) {
    let newVal: any = {}, oldVal: any = {};
    try { newVal = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
    try { oldVal = log.old_value ? JSON.parse(log.old_value) : {}; } catch {}

    if (log.action_type !== 'CREATE' && log.action_type !== 'STATUS_CHANGE' &&
        (!newVal.remark || newVal.remark.trim() === '')) continue;

    const dateStr = new Date(log.created_at).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    let entry = `[${dateStr}] ${log.action_type}`;
    if (log.action_type === 'STATUS_CHANGE') {
      entry += ` (${oldVal.status_code || 'none'} -> ${newVal.status_code || 'none'})`;
    } else if (log.action_type === 'CREATE') {
      entry += ` (Initial: ${newVal.status_code || 'none'})`;
    }
    if (newVal.remark && newVal.remark.trim() !== '') entry += ` | Remark: "${newVal.remark}"`;

    (historyMap[log.agent_customer_id] ||= []).push(entry);
  }

  return rows.map((row: any) => ({
    ...row,
    full_history: historyMap[row.agent_customer_id]
      ? historyMap[row.agent_customer_id].join('\n')
      : 'No history recorded',
  }));
}

// ----------------------------------------------------------------------------
// DRILL DOWN — no JSON scan, sargable dates
// ----------------------------------------------------------------------------
export async function getSupervisorDrillDown(
  supervisorId: number,
  filterAgentId: string,
  projectId: string,
  startDate: string,
  endDate: string,
  statusCode: string,
  section: string,
  dayNum?: number,
  mode?: string
) {
  const params: any[] = [supervisorId];
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

  let whereClause = "";
  let orderByCol = "ac.updated_at";

  if (statusCode !== 'all') {
    let dateCol = "ac.updated_at";
    if (section === 'cards') {
      dateCol = ['visit-done','booking-done','virtual-meet-done'].includes(statusCode) ? "ac.done_date" : "ac.updated_at";
    } else if (section === 'pipeline') {
      dateCol = "ac.follow_up_date";
    } else if (section === 'volume') {
      dateCol = ['visit-done','booking-done','virtual-meet-done'].includes(statusCode) ? "ac.done_date" : "ac.assigned_at";
    }
    params.push(startDate, endDate);
    whereClause = ` AND ${dateRange(dateCol)} AND ac.status_code = ? `;
    params.push(statusCode);
    if (dayNum) {
      whereClause += ` AND (WEEKDAY(${dateCol}) + 1) = ? `;
      params.push(dayNum);
    }
    orderByCol = dateCol;
  } else {
    if (section === 'pipeline') {
      whereClause = `
        AND ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed')
        AND ${dateRange("ac.follow_up_date")}
      `;
      params.push(startDate, endDate);
      if (dayNum) {
        whereClause += ` AND (WEEKDAY(ac.follow_up_date) + 1) = ? `;
        params.push(dayNum);
      }
      orderByCol = "ac.follow_up_date";
    } else if (section === 'volume') {
      whereClause = `
        AND (
          ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.done_date")} )
          OR
          ( ac.status_code NOT IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.assigned_at")} )
        )
      `;
      params.push(startDate, endDate, startDate, endDate);
      if (dayNum) {
        whereClause += `
          AND (
            CASE WHEN ac.status_code IN ('visit-done','booking-done','virtual-meet-done')
                 THEN (WEEKDAY(ac.done_date) + 1)
                 ELSE (WEEKDAY(ac.assigned_at) + 1)
            END
          ) = ?
        `;
        params.push(dayNum);
      }
      orderByCol = "ac.assigned_at";
    }
  }

  if (mode === 'fresh') {
    whereClause += " AND IFNULL(ac.distinct_followup_dates,1) <= 1 ";
  } else if (mode === 'repeated') {
    whereClause += " AND ac.distinct_followup_dates > 1 ";
  }

  const sql = `
    SELECT
      c.name AS customer_name, c.contact AS contact,
      ac.status_code, ac.follow_up_date, ac.follow_up_time, ac.done_date, ac.assigned_at,
      p.name AS project_name,
      u.first_name AS agent_first_name, u.last_name AS agent_last_name,
      CASE
        WHEN ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed') THEN
          IF(IFNULL(ac.distinct_followup_dates,1) <= 1, 'Fresh', 'Repeated')
        ELSE 'N/A'
      END AS pipeline_lead_type
    FROM agent_customers ac
    JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
    JOIN customers c ON c.id = ac.customer_id
    LEFT JOIN projects p ON p.id = c.project_id
    WHERE 1=1
      ${agentFilter}
      ${projectFilter}
      ${whereClause}
    ORDER BY ${orderByCol} DESC
    LIMIT 200
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}

// ----------------------------------------------------------------------------
// GLOBAL SEARCH (exact 10-digit contact)
// ----------------------------------------------------------------------------
export async function searchGlobalCustomers(contactNumber: string) {
  const [rows] = await db.query(
    // Phase 6: also expose ac.id (agent_customer_id) for journey lookup, and
    // ac.agent_id + c.project_id so the supervisor's reassign modal can
    // pre-fill the current assignment ("transfer auto-select"). Existing
    // fields are preserved 1:1; only new columns added.
    `SELECT c.id AS customer_id, c.name AS customer_name, c.contact,
            c.project_id,
            ac.id AS agent_customer_id,
            ac.agent_id,
            ac.status_code, ac.follow_up_date, ac.follow_up_time,
            p.name AS project_name,
            u.first_name AS agent_name,
            u.first_name AS agent_first_name,
            u.last_name AS agent_last_name
       FROM customers c
       LEFT JOIN agent_customers ac ON c.id = ac.customer_id AND ac.is_active = 1
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN users u ON ac.agent_id = u.id
      WHERE c.contact = ?
      ORDER BY c.updated_at DESC
      LIMIT 50`,
    [contactNumber]
  );
  return rows;
}

// ----------------------------------------------------------------------------
// Phase 6 — CUSTOMER JOURNEY (supervisor read-only audit view)
// ----------------------------------------------------------------------------
// Returns the same shape as agent's getCustomerRemarkHistory: an array of
// { date, action_type, old_status, new_status, remark }. Enforces supervisor
// ownership via the users.supervisor_id JOIN so a supervisor can never read
// the journey of an agent they don't manage.
export async function getSupervisorCustomerJourney(
  agentCustomerId: number,
  supervisorId: number
) {
  // Ownership guard: ensure this agent_customer belongs to one of supervisor's agents.
  const [owners]: any = await db.query(
    `SELECT ac.id
       FROM agent_customers ac
       JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
      WHERE ac.id = ?
      LIMIT 1`,
    [supervisorId, agentCustomerId]
  );
  if (!owners || owners.length === 0) return null;

  const [rows]: any = await db.query(
    `SELECT created_at, action_type, old_value, new_value
       FROM agent_customer_logs
      WHERE agent_customer_id = ?
      ORDER BY created_at DESC
      LIMIT 200`,
    [agentCustomerId]
  );

  return rows.map((log: any) => {
    let newVal: any = {}, oldVal: any = {};
    try { newVal = log.new_value ? JSON.parse(log.new_value) : {}; } catch {}
    try { oldVal = log.old_value ? JSON.parse(log.old_value) : {}; } catch {}
    return {
      date: log.created_at,
      action_type: log.action_type,
      old_status: oldVal.status_code || null,
      new_status: newVal.status_code || null,
      remark: newVal.remark && newVal.remark.trim() !== "" ? newVal.remark : null,
    };
  }).filter((item: any) =>
    item.action_type === 'CREATE' ||
    item.action_type === 'STATUS_CHANGE' ||
    item.remark
  );
}

// ----------------------------------------------------------------------------
// REASSIGN TRANSACTION (counters initialized on the new assignment)
// ----------------------------------------------------------------------------
export async function reassignCustomerTransaction(
  customerId: number,
  newAgentId: number,
  newProjectId: number,
  supervisorId: number
) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`UPDATE customers SET project_id = ? WHERE id = ?`, [newProjectId, customerId]);

    const [oldAssignments]: any = await conn.query(
      `SELECT * FROM agent_customers WHERE customer_id = ? AND is_active = 1`,
      [customerId]
    );
    const oldAssignment = oldAssignments[0];

    if (oldAssignment) {
      if (oldAssignment.agent_id === newAgentId) {
        await conn.commit();
        return true;
      }
      await conn.query(
        `UPDATE agent_customers SET is_active = 0, status_code = 'transferred' WHERE id = ?`,
        [oldAssignment.id]
      );
    }

    const [newResult]: any = await conn.query(
      `INSERT INTO agent_customers
        (agent_id, customer_id, source, rating, budget, configuration, purpose,
         status_code, remark, is_active, last_status_change_at, distinct_followup_dates)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ringing', 'Transferred by Supervisor', 1, NOW(), 0)
       ON DUPLICATE KEY UPDATE
         is_active = 1,
         status_code = 'ringing',
         follow_up_date = NULL,
         follow_up_time = NULL,
         done_date = NULL,
         assigned_at = CURRENT_TIMESTAMP,
         last_status_change_at = NOW(),
         distinct_followup_dates = 0`,
      [
        newAgentId, customerId,
        oldAssignment?.source || null,
        oldAssignment?.rating || 'Cold',
        oldAssignment?.budget || null,
        oldAssignment?.configuration || null,
        oldAssignment?.purpose || null,
      ]
    );

    let newAgentCustomerId = newResult.insertId;
    if (newAgentCustomerId === 0) {
      const [existing]: any = await conn.query(
        `SELECT id FROM agent_customers WHERE agent_id = ? AND customer_id = ? LIMIT 1`,
        [newAgentId, customerId]
      );
      newAgentCustomerId = existing[0].id;
    }

    const oldVal = oldAssignment
      ? JSON.stringify({ agent_id: oldAssignment.agent_id, project_id: oldAssignment.project_id })
      : null;
    const newVal = JSON.stringify({ agent_id: newAgentId, project_id: newProjectId });

    await conn.query(
      `INSERT INTO agent_customer_logs
        (agent_customer_id, agent_id, action_type, old_value, new_value)
       VALUES (?, ?, 'EDIT', ?, ?)`,
      [newAgentCustomerId, supervisorId, oldVal, newVal]
    );

    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// ----------------------------------------------------------------------------
// WHATSAPP AUDIT — paginated, default 30-day window
// ----------------------------------------------------------------------------
export async function getWhatsAppAuditLog(
  supervisorId: number,
  filterAgentId?: number,
  startDate?: string,
  endDate?: string,
  page: number = 1,
  limit: number = 200
): Promise<any[]> {
  const effLimit = Math.min(Math.max(limit, 1), 1000);
  const offset = (Math.max(page, 1) - 1) * effLimit;

  // Default to last 30 days when no dates supplied — prevents full-table scan.
  let effStart = startDate;
  let effEnd = endDate;
  if (!effStart && !effEnd) {
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - 30);
    effStart = start.toISOString().slice(0, 10);
    effEnd = end.toISOString().slice(0, 10);
  }

  let sql = `
    SELECT
      wml.id, wml.created_at AS sent_at, wml.status,
      u.first_name, u.last_name,
      c.name AS customer_name, c.contact AS phone,
      p.name AS project_name,
      wt.template_code,
      wml.delivery_mode, wml.message_preview
    FROM whatsapp_message_logs wml
    JOIN users u ON u.id = wml.agent_id AND u.supervisor_id = ?
    JOIN customers c ON c.id = wml.customer_id
    JOIN projects p ON p.id = wml.project_id
    LEFT JOIN whatsapp_templates wt ON wt.id = wml.template_id
    WHERE 1=1
  `;
  const params: any[] = [supervisorId];

  if (filterAgentId) {
    sql += " AND wml.agent_id = ?";
    params.push(filterAgentId);
  }
  if (effStart) {
    sql += " AND wml.created_at >= ?";
    params.push(effStart);
  }
  if (effEnd) {
    sql += " AND wml.created_at < DATE_ADD(?, INTERVAL 1 DAY)";
    params.push(effEnd);
  }
  sql += " ORDER BY wml.created_at DESC LIMIT ? OFFSET ?";
  params.push(effLimit, offset);

  const [rows]: any = await db.query(sql, params);
  return rows.map((row: any) => ({ ...row, agent_name: row.first_name, sent_at: row.sent_at }));
}

// ============================================================================
// AGENT PERFORMANCE MATRIX  (rows = agents, columns = statuses)
// ----------------------------------------------------------------------------
// Single aggregation: GROUP BY ac.agent_id, ac.status_code over the supervisor-
// scoped join. The date window is applied GLOBALLY using the SAME done_date /
// updated_at split as the Cards view (getSupervisorVisitsBooking) so that:
//   - column totals reconcile exactly with the existing Cards numbers, and
//   - a cell click can reuse GET /drill-down with section="cards".
//
// "All agents" guarantee: we merge the grouped counts with the full associate
// list so every supervised agent appears, even with an all-zero row.
//
// Derived metrics are computed in JS from the grouped rows (cheap; no extra
// round-trips). No frontend aggregation of raw leads.
// ============================================================================

// Canonical column order shared with the frontend matrix.
const MATRIX_STATUS_ORDER = [
  "ringing",
  "follow-up",
  "visit-proposed",
  "visit-confirmed",
  "virtual-meet-confirmed",
  "virtual-meet-done",
  "visit-done",
  "booking-done",
  "sdow",
  "not-reachable",
  "lost",
] as const;

const DONE_STATUSES = ["visit-done", "booking-done", "virtual-meet-done"];
const COMPLETED_STATUSES = ["visit-done", "virtual-meet-done", "booking-done"];
// Active = excludes booking-done, lost, virtual-meet-done, visit-done (per spec).
const NON_ACTIVE_STATUSES = ["booking-done", "lost", "virtual-meet-done", "visit-done"];

export async function getSupervisorAgentMatrix(
  supervisorId: number,
  projectId: string,
  startDate: string,
  endDate: string
) {
  // 1) Full associate list — guarantees every supervised agent shows up.
  const [agentRows]: any = await db.query(
    `SELECT id, CONCAT(first_name,' ',last_name) AS name
       FROM users
      WHERE supervisor_id = ? AND is_active = 1
      ORDER BY first_name, last_name`,
    [supervisorId]
  );

  // 2) Grouped counts. Project filter is optional; agent is NOT filtered here
  //    because the matrix intentionally shows ALL agents at once.
  const params: any[] = [supervisorId];
  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ? ";
    params.push(projectId);
  }

  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = `
      AND (
        ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done')
          AND ac.done_date IS NOT NULL AND ${dateRange("ac.done_date")} )
        OR
        ( ac.status_code NOT IN ('visit-done','booking-done','virtual-meet-done')
          AND ${dateRange("ac.updated_at")} )
      )`;
    params.push(startDate, endDate, startDate, endDate);
  }

  const [countRows]: any = await db.query(
    `SELECT ac.agent_id, ac.status_code, COUNT(*) AS count
       FROM agent_customers ac
       JOIN users u ON u.id = ac.agent_id AND u.supervisor_id = ?
       JOIN customers c ON c.id = ac.customer_id
      WHERE 1=1
        ${projectFilter}
        ${dateFilter}
      GROUP BY ac.agent_id, ac.status_code`,
    params
  );

  // 3) Index grouped counts by agent → status.
  const byAgent: Record<number, Record<string, number>> = {};
  for (const r of countRows) {
    const aid = Number(r.agent_id);
    (byAgent[aid] ||= {})[r.status_code] = Number(r.count);
  }

  // 4) Build per-agent rows with derived metrics + accumulate column totals.
  const columnTotals: Record<string, number> = {};
  for (const s of MATRIX_STATUS_ORDER) columnTotals[s] = 0;

  const agents = agentRows.map((a: any) => {
    const counts = byAgent[Number(a.id)] || {};
    const statuses: Record<string, number> = {};
    let total = 0;
    let completed = 0;
    let nonActive = 0;

    for (const s of MATRIX_STATUS_ORDER) {
      const c = Number(counts[s] || 0);
      statuses[s] = c;
      total += c;
      columnTotals[s] += c;
      if (COMPLETED_STATUSES.includes(s)) completed += c;
      if (NON_ACTIVE_STATUSES.includes(s)) nonActive += c;
    }

    const bookings = statuses["booking-done"] || 0;
    return {
      agent_id: Number(a.id),
      agent_name: a.name,
      statuses,
      total,
      active: total - nonActive,
      completed,
      bookings,
      conversion_rate: total > 0 ? Number(((bookings / total) * 100).toFixed(1)) : 0,
      completion_rate: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
    };
  });

  // 5) Team-level KPI summary derived from the same grouped totals.
  const grandTotal = MATRIX_STATUS_ORDER.reduce((sum, s) => sum + columnTotals[s], 0);
  const totalBookings = columnTotals["booking-done"] || 0;
  const totalCompleted =
    (columnTotals["visit-done"] || 0) +
    (columnTotals["virtual-meet-done"] || 0) +
    (columnTotals["booking-done"] || 0);
  const totalNonActive = NON_ACTIVE_STATUSES.reduce((sum, s) => sum + (columnTotals[s] || 0), 0);

  const summary = {
    total_leads: grandTotal,
    total_followups: columnTotals["follow-up"] || 0,
    total_ringing: columnTotals["ringing"] || 0,
    total_visits_done: columnTotals["visit-done"] || 0,
    total_virtual_meetings_done: columnTotals["virtual-meet-done"] || 0,
    total_bookings: totalBookings,
    total_lost: columnTotals["lost"] || 0,
    active_leads: grandTotal - totalNonActive,
    conversion_rate: grandTotal > 0 ? Number(((totalBookings / grandTotal) * 100).toFixed(1)) : 0,
    completion_rate: grandTotal > 0 ? Number(((totalCompleted / grandTotal) * 100).toFixed(1)) : 0,
  };

  return {
    statusOrder: [...MATRIX_STATUS_ORDER],
    agents,
    columnTotals,
    summary,
  };
}
