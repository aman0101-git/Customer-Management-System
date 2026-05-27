// ============================================================================
// backend/src/modules/customers/customer.service.ts
// ----------------------------------------------------------------------------
// Production optimization (May 2026):
//   1. SARGABLE DATE FILTERS — DATE(col) BETWEEN replaced with col >= ? AND
//      col < DATE_ADD(?, INTERVAL 1 DAY) so MySQL can use indexes.
//   2. NO MORE JSON SCANS — getDashboardPipeline / getAgentDrillDown now read
//      agent_customers.distinct_followup_dates directly. Requires the
//      column + backfill from optimization/02_schema_additions.sql + 03b.
//   3. COUNTERS MAINTAINED IN-TRANSACTION — createAgentCustomer and
//      updateAgentCustomer keep distinct_followup_dates and
//      last_status_change_at in sync inside the same transaction as the log.
//   4. SLIM SELECTS + SAFETY LIMITS on getAgentCustomers / getAgentFollowUps.
//   5. EDIT-LOG NOISE REDUCED — action_type='EDIT' rows only written if
//      something actually changed.
// ============================================================================

import { db } from "../../config/db.js";

// Helper: Final Status from Status Code
const calculateFinalStatus = (statusCode: string) =>
  (
    statusCode === "visit-done" ||
    statusCode === "booking-done" ||
    statusCode === "virtual-meet-done"
  ) ? "COMPLETED" : "PENDING";

// ----------------------------------------------------------------------------
// READS
// ----------------------------------------------------------------------------

export async function getAgentCustomerMerged(agentCustomerId: number, agentId: number) {
  const [rows]: any = await db.query(
    `SELECT ac.id, ac.status_code, ac.follow_up_date, ac.follow_up_time,
            ac.done_date, ac.remark, ac.assigned_at, ac.rating,
            ac.configuration AS config, ac.budget, ac.purpose, ac.source,
            ac.final_status,
            c.name, c.contact AS phone, c.location, c.pincode, c.profession, c.designation,
            c.project_id, c.id AS customer_id, c.updated_at, c.created_at
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     WHERE ac.id = ? AND ac.agent_id = ?
     LIMIT 1`,
    [agentCustomerId, agentId]
  );
  return rows[0] || null;
}

export async function completeAgentCustomer(agentCustomerId: number, agentId: number) {
  const [rows]: any = await db.query(
    "SELECT status_code FROM agent_customers WHERE id = ? AND agent_id = ? LIMIT 1",
    [agentCustomerId, agentId]
  );
  if (!rows.length) return "FORBIDDEN";
  const status = rows[0].status_code;
  if (
    status !== "visit-done" &&
    status !== "booking-done" &&
    status !== "virtual-meet-done" &&
    status !== "lost"
  ) return "FORBIDDEN";
  await db.query(
    `UPDATE agent_customers SET final_status = 'COMPLETED', is_active = 0 WHERE id = ?`,
    [agentCustomerId]
  );
  return "OK";
}

/**
 * Get all customers for an agent.
 * Optional pagination: pass {page, limit} from controller to enable; default
 * behavior (no params) returns up to 5000 records to preserve compatibility
 * with the existing AgentCustomersPage while preventing runaway responses.
 */
export async function getAgentCustomers(
  agentId: number,
  page?: number,
  limit?: number
) {
  const effectiveLimit = Math.min(Math.max(limit ?? 5000, 1), 5000);
  const offset = page && page > 0 ? (page - 1) * effectiveLimit : 0;

  const [rows]: any = await db.query(
    `SELECT ac.id, ac.agent_id, ac.customer_id, ac.status_code, ac.final_status,
            ac.follow_up_date, ac.follow_up_time, ac.done_date,
            ac.budget, ac.configuration, ac.rating, ac.source, ac.purpose,
            ac.remark, ac.assigned_at, ac.updated_at, ac.is_active,
            c.name, c.contact, c.location, c.pincode, c.profession, c.designation,
            c.created_at, c.updated_at AS customer_updated_at,
            p.name AS project_name, p.id AS project_id
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE ac.agent_id = ?
       AND ac.is_active = 1
       AND ac.status_code <> 'lost'
     ORDER BY ac.assigned_at DESC
     LIMIT ? OFFSET ?`,
    [agentId, effectiveLimit, offset]
  );
  return rows;
}

export async function searchCustomerForAgent(phone: string, agentId: number) {
  const [rows]: any = await db.query(
    `SELECT ac.*, ac.follow_up_date, ac.follow_up_time, ac.done_date,
            ac.source, ac.rating, ac.budget, ac.configuration, ac.purpose, ac.final_status,
            c.name, c.contact, c.location, c.pincode, c.project_id, c.profession, c.designation, c.created_at,
            p.name AS project_name
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE ac.agent_id = ? AND c.contact = ?
     LIMIT 1`,
    [agentId, phone]
  );
  return rows[0] || null;
}

// ----------------------------------------------------------------------------
// DATE HELPERS
// ----------------------------------------------------------------------------
const parseDatesBasedOnStatus = (data: any) => {
  const isDone =
    data.status_code === "visit-done" ||
    data.status_code === "booking-done" ||
    data.status_code === "virtual-meet-done";
  const isLost = data.status_code === "lost";

  if (isLost) return { followUpDate: null, followUpTime: null, doneDate: null };

  if (isDone) {
    let doneDate = null;
    if (data.done_date) {
      try { doneDate = new Date(data.done_date).toISOString().slice(0, 10); } catch {}
    }
    return { followUpDate: null, followUpTime: null, doneDate };
  }

  let followUpDate = null, followUpTime = null;
  if (data.follow_up_date) {
    try { followUpDate = new Date(data.follow_up_date).toISOString().slice(0, 10); } catch {}
  }
  if (data.follow_up_time) {
    try {
      const t = new Date(`1970-01-01T${data.follow_up_time}`);
      if (!isNaN(t.getTime())) followUpTime = t.toTimeString().slice(0, 8);
    } catch {}
  }
  return { followUpDate, followUpTime, doneDate: null };
};

// ----------------------------------------------------------------------------
// WRITES — keep counters in sync inside the same transaction
// ----------------------------------------------------------------------------

export async function createAgentCustomer(agentId: number, data: any) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existing]: any = await conn.query(
      "SELECT id FROM customers WHERE contact = ? AND project_id = ? LIMIT 1",
      [data.contact, data.project_id]
    );

    let customerId: number;
    if (existing.length) {
      customerId = existing[0].id;
      await conn.query(
        `UPDATE customers
            SET name = ?, location = ?, pincode = ?, profession = ?, designation = ?
          WHERE id = ?`,
        [data.name, data.location, data.pincode, data.profession, data.designation, customerId]
      );
    } else {
      const [result]: any = await conn.query(
        `INSERT INTO customers (name, contact, location, pincode, profession, designation, project_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.contact, data.location, data.pincode, data.profession, data.designation, data.project_id]
      );
      customerId = result.insertId;
    }

    const { followUpDate, followUpTime, doneDate } = parseDatesBasedOnStatus(data);
    const finalStatus = calculateFinalStatus(data.status_code);

    const [assignment]: any = await conn.query(
      `INSERT INTO agent_customers
        (agent_id, customer_id, source, rating, budget, configuration, purpose,
         status_code, final_status, follow_up_date, follow_up_time, done_date, remark,
         last_status_change_at, distinct_followup_dates)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        agentId, customerId,
        data.source,
        data.leadRating || data.lead_rating || data.rating,
        data.budget,
        data.config || data.configuration,
        data.purpose,
        data.status_code, finalStatus,
        followUpDate, followUpTime, doneDate, data.remark,
        followUpDate ? 1 : 0,
      ]
    );

    await conn.query(
      `INSERT INTO agent_customer_logs (agent_customer_id, agent_id, action_type, old_value, new_value)
       VALUES (?, ?, 'CREATE', NULL, ?)`,
      [assignment.insertId, agentId, JSON.stringify(data)]
    );

    await conn.commit();
    return {
      success: true,
      data: {
        agent_customer_id: assignment.insertId,
        customer_id: customerId,
        project_id: data.project_id,
      },
    };
  } catch (err: any) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") throw { code: "DUPLICATE_ASSIGNMENT" };
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateAgentCustomer(
  agentCustomerId: number,
  agentId: number,
  data: any
) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [oldRows]: any = await conn.query(
      "SELECT * FROM agent_customers WHERE id = ? AND agent_id = ? LIMIT 1",
      [agentCustomerId, agentId]
    );
    if (!oldRows.length) {
      await conn.rollback();
      return null;
    }
    const oldValue = oldRows[0];

    const { followUpDate, followUpTime, doneDate } = parseDatesBasedOnStatus(data);
    const finalStatus = calculateFinalStatus(data.status_code);

    const statusChanged = oldValue.status_code !== data.status_code;
    const followUpDateChanged = (oldValue.follow_up_date?.toString() || null) !== (followUpDate || null);
    const meaningfulChange =
      statusChanged ||
      followUpDateChanged ||
      (oldValue.follow_up_time?.toString() || null) !== (followUpTime || null) ||
      (oldValue.remark || null) !== (data.remark || null) ||
      (oldValue.rating || null) !== (data.leadRating || data.lead_rating || data.rating || null) ||
      (oldValue.configuration || null) !== (data.config || data.configuration || null) ||
      (oldValue.budget || null) !== (data.budget || null) ||
      (oldValue.purpose || null) !== (data.purpose || null);

    let newDistinctCount = oldValue.distinct_followup_dates ?? 0;
    let touchLastStatusChange = false;

    if (statusChanged) {
      newDistinctCount = followUpDate ? 1 : 0;
      touchLastStatusChange = true;
    } else if (followUpDateChanged && followUpDate) {
      const oldDate = oldValue.follow_up_date
        ? new Date(oldValue.follow_up_date).toISOString().slice(0, 10)
        : null;
      if (oldDate !== followUpDate) newDistinctCount += 1;
    }

    await conn.query(
      `UPDATE agent_customers
          SET status_code = ?, final_status = ?, follow_up_date = ?, follow_up_time = ?,
              done_date = ?, remark = ?, rating = ?, configuration = ?, budget = ?, purpose = ?,
              distinct_followup_dates = ?,
              last_status_change_at = CASE WHEN ? THEN NOW() ELSE last_status_change_at END
        WHERE id = ?`,
      [
        data.status_code, finalStatus, followUpDate, followUpTime, doneDate,
        data.remark,
        data.leadRating || data.lead_rating || data.rating,
        data.config || data.configuration,
        data.budget, data.purpose,
        newDistinctCount,
        touchLastStatusChange ? 1 : 0,
        agentCustomerId,
      ]
    );

    if (data.name || data.location || data.pincode || data.profession || data.designation || data.project_id) {
      const fields: string[] = [];
      const params: any[] = [];
      if (data.name !== undefined) { fields.push("name = ?"); params.push(data.name); }
      if (data.location !== undefined) { fields.push("location = ?"); params.push(data.location); }
      if (data.pincode !== undefined) { fields.push("pincode = ?"); params.push(data.pincode); }
      if (data.profession !== undefined) { fields.push("profession = ?"); params.push(data.profession); }
      if (data.designation !== undefined) { fields.push("designation = ?"); params.push(data.designation); }
      if (data.project_id !== undefined) { fields.push("project_id = ?"); params.push(data.project_id); }

      if (fields.length) {
        params.push(oldValue.customer_id);
        await conn.query(
          `UPDATE customers SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
          params
        );
      }
    }

    let actionType: "EDIT" | "STATUS_CHANGE" | null = null;
    if (statusChanged) actionType = "STATUS_CHANGE";
    else if (meaningfulChange) actionType = "EDIT";

    if (actionType) {
      const [newRows]: any = await conn.query(
        "SELECT * FROM agent_customers WHERE id = ? LIMIT 1",
        [agentCustomerId]
      );
      const newValue = newRows[0];
      await conn.query(
        `INSERT INTO agent_customer_logs
            (agent_customer_id, agent_id, action_type, old_value, new_value)
         VALUES (?, ?, ?, ?, ?)`,
        [agentCustomerId, agentId, actionType, JSON.stringify(oldValue), JSON.stringify(newValue)]
      );
      await conn.commit();
      return newValue;
    }

    await conn.commit();
    return oldValue;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getCustomerRemarkHistory(agentCustomerId: number) {
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
// DASHBOARD ANALYTICS — SARGABLE DATE FILTERS, NO MORE JSON SCANS
// ----------------------------------------------------------------------------

/**
 * Sargable date-range predicate.
 *   Instead of: WHERE DATE(col) BETWEEN ? AND ?
 *   We emit:    WHERE col >= ? AND col < DATE_ADD(?, INTERVAL 1 DAY)
 * This lets MySQL use indexes on col.
 */
function dateRange(col: string): string {
  return `${col} >= ? AND ${col} < DATE_ADD(?, INTERVAL 1 DAY)`;
}

export async function getDashboardVisitsBooking(
  agentId: number,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const params: any[] = [agentId];
  let projectFilter = "";
  if (projectId && projectId !== "all") {
    projectFilter = " AND c.project_id = ?";
    params.push(projectId);
  }

  const fullParams = [
    ...params,
    startDate, endDate,
    startDate, endDate,
    startDate, endDate,
  ];

  const [rows]: any = await db.query(
    `SELECT status_code, COUNT(*) AS count
       FROM (
         SELECT ac.status_code
           FROM agent_customers ac
           JOIN customers c ON c.id = ac.customer_id
          WHERE ac.agent_id = ?
            ${projectFilter}
            AND (
              ( ac.status_code IN ('visit-proposed','visit-confirmed','ringing','virtual-meet-confirmed','follow-up','sdow','not-reachable')
                AND ac.follow_up_date IS NOT NULL
                AND ${dateRange("ac.follow_up_date")} )
              OR
              ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done')
                AND ac.done_date IS NOT NULL
                AND ${dateRange("ac.done_date")} )
              OR
              ( ac.status_code = 'lost'
                AND ac.updated_at IS NOT NULL
                AND ${dateRange("ac.updated_at")} )
            )
       ) t
      GROUP BY status_code`,
    fullParams
  );

  const out: Record<string, number> = {};
  rows.forEach((r: any) => (out[r.status_code] = r.count));
  return out;
}

export async function getDashboardPipeline(
  agentId: number,
  startDate: string,
  endDate: string,
  _mode: string = "all"
) {
  const [rows]: any = await db.query(
    `SELECT ac.status_code,
            (WEEKDAY(ac.follow_up_date) + 1) AS day_num,
            SUM(CASE WHEN IFNULL(ac.distinct_followup_dates,1) <= 1 THEN 1 ELSE 0 END) AS fresh,
            SUM(CASE WHEN ac.distinct_followup_dates > 1 THEN 1 ELSE 0 END) AS repeated
       FROM agent_customers ac
      WHERE ac.agent_id = ?
        AND ${dateRange("ac.follow_up_date")}
        AND ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed')
      GROUP BY ac.status_code, day_num`,
    [agentId, startDate, endDate]
  );
  return rows;
}

export async function getDashboardStatusCounts(
  agentId: number,
  projectId: string,
  startDate: string,
  endDate: string
) {
  const params: any[] = [agentId];
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
       JOIN customers c ON ac.customer_id = c.id
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
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

export async function getAgentProjects(agentId: number) {
  const [rows]: any = await db.query(
    `SELECT DISTINCT p.id, p.name
       FROM agent_customers ac
       JOIN customers c ON ac.customer_id = c.id
       JOIN projects p ON c.project_id = p.id
      WHERE ac.agent_id = ?`,
    [agentId]
  );
  return rows;
}

export async function getAgentFollowUps(agentId: number) {
  const [rows]: any = await db.query(
    `SELECT ac.id AS agent_customer_id,
            c.id AS customer_id,
            ac.status_code, ac.follow_up_date, ac.follow_up_time, ac.remark,
            c.name, c.contact, c.location, c.project_id,
            p.name AS project_name
       FROM agent_customers ac
       JOIN customers c ON ac.customer_id = c.id
       LEFT JOIN projects p ON c.project_id = p.id
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
        AND ac.follow_up_date IS NOT NULL
        AND ac.status_code <> 'lost'
        AND (ac.final_status <> 'COMPLETED' OR ac.final_status IS NULL)
      ORDER BY ac.follow_up_date ASC, ac.follow_up_time ASC
      LIMIT 2000`,
    [agentId]
  );
  return rows;
}

// ----------------------------------------------------------------------------
// DRILL-DOWN — sargable filters, no JSON scan (reads distinct_followup_dates)
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// AGENT DASHBOARD ANALYTICS (May 2026)
// ----------------------------------------------------------------------------
// One consolidated, single-round-trip endpoint feeds the AgentDashboard cards.
//
// All queries:
//   - filter by agent_id first (leftmost index column on every relevant index)
//   - use sargable date predicates via dateRange() so MySQL hits the indexes
//   - never JSON-scan, never DATE() the indexed column
//   - return small, shaped payloads (no SELECT *, no full table dumps)
//
// Performance shape:
//   - 6 small aggregate queries + 2 LIMIT 5 list queries
//   - All run concurrently from the controller via Promise.all
//   - Backend latency = max(query) not sum(query)
//
// Status-code dictionary used here is the SAME canonical set already used by
// AgentCustomersPage, FollowUpDashboard, SummaryDashboard and the existing
// dashboard service helpers. No new statuses are introduced.
// ----------------------------------------------------------------------------

export async function getAgentAnalyticsCustomerCounts(
  agentId: number,
  startDate: string,
  endDate: string
) {
  // Two single-row aggregates. Both columns are agent-scoped and indexable.
  const [createdRows]: any = await db.query(
    `SELECT COUNT(*) AS count
       FROM agent_customers
      WHERE agent_id = ?
        AND ${dateRange("assigned_at")}`,
    [agentId, startDate, endDate]
  );
  const [updatedRows]: any = await db.query(
    `SELECT COUNT(*) AS count
       FROM agent_customers
      WHERE agent_id = ?
        AND ${dateRange("updated_at")}`,
    [agentId, startDate, endDate]
  );
  return {
    customersCreated: Number(createdRows[0]?.count ?? 0),
    customersUpdated: Number(updatedRows[0]?.count ?? 0),
  };
}

/**
 * Overdue / Due Today / Upcoming workload counts.
 *
 * Intentionally TODAY-relative — not filtered by startDate/endDate. "Overdue"
 * is by definition a current-date concept; matches FollowUpDashboard.tsx
 * semantics where past/today/future are computed against startOfDay(now).
 */
export async function getAgentAnalyticsFollowupTimeline(agentId: number) {
  const [rows]: any = await db.query(
    `SELECT
        SUM(CASE WHEN ac.follow_up_date <  CURDATE() THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN ac.follow_up_date =  CURDATE() THEN 1 ELSE 0 END) AS due_today,
        SUM(CASE WHEN ac.follow_up_date >  CURDATE() THEN 1 ELSE 0 END) AS upcoming
       FROM agent_customers ac
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
        AND ac.follow_up_date IS NOT NULL
        AND ac.status_code <> 'lost'
        AND (ac.final_status <> 'COMPLETED' OR ac.final_status IS NULL)`,
    [agentId]
  );
  const r = rows[0] ?? {};
  return {
    overdue: Number(r.overdue ?? 0),
    dueToday: Number(r.due_today ?? 0),
    upcoming: Number(r.upcoming ?? 0),
  };
}

/**
 * Follow-up status distribution - for rows whose follow_up_date falls inside
 * the selected window. Excludes lost / completed (matches Follow-Up page).
 */
export async function getAgentAnalyticsFollowupStatusDistribution(
  agentId: number,
  startDate: string,
  endDate: string
) {
  const [rows]: any = await db.query(
    `SELECT ac.status_code, COUNT(*) AS count
       FROM agent_customers ac
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
        AND ac.follow_up_date IS NOT NULL
        AND ${dateRange("ac.follow_up_date")}
        AND ac.status_code <> 'lost'
        AND (ac.final_status <> 'COMPLETED' OR ac.final_status IS NULL)
      GROUP BY ac.status_code`,
    [agentId, startDate, endDate]
  );
  return rows.map((r: any) => ({
    status_code: r.status_code as string,
    count: Number(r.count),
  }));
}

/**
 * Summary status distribution - MUST stay byte-for-byte aligned with
 * SummaryDashboard section 3 (`getDashboardStatusCounts`) for the same window.
 *
 * Same predicate logic as getDashboardStatusCounts, aggregated to a single
 * row per status (no day_num split). No project filter (per design - the new
 * analytics page is single-dimensional; SummaryDashboard remains the place
 * for project-scoped views).
 */
export async function getAgentAnalyticsSummaryDistribution(
  agentId: number,
  startDate: string,
  endDate: string
) {
  const [rows]: any = await db.query(
    `SELECT ac.status_code, COUNT(*) AS count
       FROM agent_customers ac
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
        AND (
          ( ac.status_code IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.done_date")} )
          OR
          ( ac.status_code NOT IN ('visit-done','booking-done','virtual-meet-done') AND ${dateRange("ac.assigned_at")} )
        )
      GROUP BY ac.status_code`,
    [agentId, startDate, endDate, startDate, endDate]
  );
  return rows.map((r: any) => ({
    status_code: r.status_code as string,
    count: Number(r.count),
  }));
}

/**
 * Top 5 customers the agent updated inside the selected window.
 * Filter-scoped: lets the agent see "what did I touch this period".
 */
export async function getAgentAnalyticsTopCustomers(
  agentId: number,
  startDate: string,
  endDate: string
) {
  const [rows]: any = await db.query(
    `SELECT ac.id              AS agent_customer_id,
            ac.status_code,
            ac.updated_at,
            ac.follow_up_date,
            c.id               AS customer_id,
            c.name,
            c.contact,
            c.location,
            p.name             AS project_name
       FROM agent_customers ac
       JOIN customers c ON c.id = ac.customer_id
       LEFT JOIN projects p ON p.id = c.project_id
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
        AND ${dateRange("ac.updated_at")}
      ORDER BY ac.updated_at DESC
      LIMIT 5`,
    [agentId, startDate, endDate]
  );
  return rows;
}

/**
 * Top 5 upcoming follow-ups (today or later). Intentionally NOT filter-scoped:
 * "upcoming" is forward-looking and must always show the soonest pending work,
 * regardless of which window the agent is inspecting above.
 */
export async function getAgentAnalyticsTopFollowups(agentId: number) {
  const [rows]: any = await db.query(
    `SELECT ac.id              AS agent_customer_id,
            ac.status_code,
            ac.follow_up_date,
            ac.follow_up_time,
            c.id               AS customer_id,
            c.name,
            c.contact,
            c.location,
            p.name             AS project_name
       FROM agent_customers ac
       JOIN customers c ON c.id = ac.customer_id
       LEFT JOIN projects p ON p.id = c.project_id
      WHERE ac.agent_id = ?
        AND ac.is_active = 1
        AND ac.follow_up_date IS NOT NULL
        AND ac.follow_up_date >= CURDATE()
        AND ac.status_code <> 'lost'
        AND (ac.final_status <> 'COMPLETED' OR ac.final_status IS NULL)
      ORDER BY ac.follow_up_date ASC, ac.follow_up_time ASC
      LIMIT 5`,
    [agentId]
  );
  return rows;
}

// ----------------------------------------------------------------------------
// DRILL-DOWN - sargable filters, no JSON scan (reads distinct_followup_dates)
// ----------------------------------------------------------------------------

export async function getAgentDrillDown(
  agentId: number,
  projectId: string,
  startDate: string,
  endDate: string,
  statusCode: string,
  section: string,
  dayNum?: number
) {
  const params: any[] = [agentId];

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
      if (['visit-done', 'booking-done', 'virtual-meet-done'].includes(statusCode)) dateCol = "ac.done_date";
      else if (statusCode === 'lost') dateCol = "ac.updated_at";
      else dateCol = "ac.follow_up_date";
    } else if (section === 'pipeline') {
      dateCol = "ac.follow_up_date";
    } else if (section === 'volume') {
      if (['visit-done', 'booking-done', 'virtual-meet-done'].includes(statusCode)) dateCol = "ac.done_date";
      else dateCol = "ac.assigned_at";
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

  const pipelineLeadTypeCol = `
      CASE
          WHEN ac.status_code IN ('visit-proposed','visit-confirmed','virtual-meet-confirmed') THEN
              IF(IFNULL(ac.distinct_followup_dates,1) <= 1, 'Fresh', 'Repeated')
          ELSE 'N/A'
      END AS pipeline_lead_type
  `;

  const sql = `
    SELECT
      c.name AS customer_name,
      c.contact,
      ac.status_code,
      ac.follow_up_date, ac.follow_up_time, ac.done_date, ac.assigned_at,
      p.name AS project_name,
      ${pipelineLeadTypeCol}
    FROM agent_customers ac
    JOIN customers c ON c.id = ac.customer_id
    JOIN projects  p ON p.id = c.project_id
    WHERE ac.agent_id = ?
      ${projectFilter}
      ${whereClause}
    ORDER BY ${orderByCol} DESC
    LIMIT 200
  `;
  const [rows] = await db.query(sql, params);
  return rows;
}
