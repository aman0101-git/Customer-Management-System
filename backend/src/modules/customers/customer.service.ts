import { db } from "../../config/db.js";

// Helper to determine Final Status based on Status Code
const calculateFinalStatus = (statusCode: string) => {
  return (statusCode === "visit-done" || statusCode === "booking-done") 
    ? "COMPLETED" 
    : "PENDING";
};

// Get merged customer + agent_customer for edit
export async function getAgentCustomerMerged(agentCustomerId: number, agentId: number) {
  const [rows]: any = await db.query(
      `SELECT ac.id, ac.status_code,
              ac.follow_up_date,
              ac.follow_up_time,
              ac.done_date, 
              ac.remark, ac.assigned_at,
              ac.rating,
              ac.configuration AS config,
              ac.budget, ac.purpose, ac.source,
              ac.final_status,
              c.name, c.contact as phone, c.location, c.pincode, c.profession, c.designation, 
              c.project_id,
              c.updated_at,
              c.created_at AS created_at
       FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     WHERE ac.id = ? AND ac.agent_id = ?`,
    [agentCustomerId, agentId]
  );
  return rows[0] || null;
}

// Mark agent customer as completed if status is visit-done or booking-done
export async function completeAgentCustomer(agentCustomerId: number, agentId: number) {
  const [rows]: any = await db.query(
    "SELECT status_code FROM agent_customers WHERE id = ? AND agent_id = ?",
    [agentCustomerId, agentId]
  );
  if (!rows.length) return "FORBIDDEN";
  const status = rows[0].status_code;
  if (status !== "visit-done" && status !== "booking-done" && status !== "lost") return "FORBIDDEN";
  await db.query(
    `UPDATE agent_customers SET final_status = 'COMPLETED', is_active = false WHERE id = ?`,
    [agentCustomerId]
  );
  return "OK";
}

// Get all customers assigned to an agent
export async function getAgentCustomers(agentId: number) {
  const [rows]: any = await db.query(
    `SELECT ac.*, ac.follow_up_date, ac.follow_up_time, ac.budget, ac.status_code,
            c.name, c.contact, c.location, c.pincode, c.profession, c.designation, c.created_at, c.updated_at,
            p.name AS project_name,
            p.id AS project_id
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE ac.agent_id = ?
       AND ac.is_active = 1
       AND ac.status_code != 'lost'
     ORDER BY ac.assigned_at DESC`,
    [agentId]
  );
  return rows;
}

export async function searchCustomerForAgent(
  phone: string,
  agentId: number
) {
  const [customers]: any = await db.query(
    "SELECT id, name, contact FROM customers WHERE contact = ?",
    [phone]
  );

  if (!customers.length) return null;

  const customerId = customers[0].id;

  const [assignments]: any = await db.query(
    `SELECT ac.*, ac.follow_up_date, ac.follow_up_time, ac.done_date,
            ac.source, ac.rating, ac.budget, ac.configuration, ac.purpose, ac.final_status,
            c.name, c.contact, c.location, c.pincode, c.project_id, c.profession, c.designation, c.created_at,
            p.name as project_name
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE ac.agent_id = ? AND ac.customer_id = ?`,
    [agentId, customerId]
  );

  return assignments.length ? assignments[0] : null;
}

// --- HELPER FOR DATE PARSING ---
const parseDatesBasedOnStatus = (data: any) => {
  const isDone = data.status_code === "visit-done" || data.status_code === "booking-done";
  const isLost = data.status_code === "lost";

  let followUpDate = null;
  let followUpTime = null;
  let doneDate = null;

  // SCENARIO 1: LOST (No dates needed)
  if (isLost) {
    return { followUpDate: null, followUpTime: null, doneDate: null };
  }

  // SCENARIO 2: DONE (Done Date required, Follow-up disabled)
  if (isDone) {
    if (data.done_date && data.done_date !== "") {
      try {
        doneDate = new Date(data.done_date).toISOString().slice(0, 10);
      } catch {}
    }
    return { followUpDate: null, followUpTime: null, doneDate };
  }

  // SCENARIO 3: NORMAL STATUS (Follow-up required, Done Date disabled)
  if (data.follow_up_date && data.follow_up_date !== "") {
    try {
      followUpDate = new Date(data.follow_up_date).toISOString().slice(0, 10);
    } catch {}
  }

  if (data.follow_up_time && data.follow_up_time !== "") {
    try {
      const t = new Date(`1970-01-01T${data.follow_up_time}`);
      if (!isNaN(t.getTime())) {
        followUpTime = t.toTimeString().slice(0, 8);
      }
    } catch {}
  }

  return { followUpDate, followUpTime, doneDate: null };
};


export async function createAgentCustomer(agentId: number, data: any) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [existing]: any = await conn.query(
      "SELECT id FROM customers WHERE contact = ?",
      [data.contact]
    );

    let customerId;

    if (existing.length) {
      customerId = existing[0].id;
      await conn.query(
        `UPDATE customers SET name = ?, location = ?, pincode = ?, profession = ?, designation = ? WHERE id = ?`,
        [data.name, data.location, data.pincode, data.profession, data.designation, customerId]
      );
    } else {
      const [result]: any = await conn.query(
        `INSERT INTO customers (name, contact, location, pincode, profession, designation, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.name, data.contact, data.location, data.pincode, data.profession, data.designation, data.project_id]
      );
      customerId = result.insertId;
    }

    // Logic to handle dates based on status
    const { followUpDate, followUpTime, doneDate } = parseDatesBasedOnStatus(data);
    const finalStatus = calculateFinalStatus(data.status_code);

    const [assignment]: any = await conn.query(
      `INSERT INTO agent_customers
       (agent_id, customer_id, source, rating, budget, configuration, purpose,
        status_code, final_status, follow_up_date, follow_up_time, done_date, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        customerId,
        data.source,
        data.leadRating || data.lead_rating || data.rating,
        data.budget,
        data.config || data.configuration,
        data.purpose,
        data.status_code,
        finalStatus, 
        followUpDate, 
        followUpTime, 
        doneDate, // NEW FIELD
        data.remark,
      ]
    );

    await conn.query(
      `INSERT INTO agent_customer_logs (agent_customer_id, agent_id, action_type, old_value, new_value)
       VALUES (?, ?, 'CREATE', NULL, ?)` ,
      [assignment.insertId, agentId, JSON.stringify(data)]
    );

    await conn.commit();

    return { agent_customer_id: assignment.insertId };
  } catch (err: any) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      throw { code: "DUPLICATE_ASSIGNMENT" };
    }
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
  const [check]: any = await db.query(
    "SELECT id FROM agent_customers WHERE id = ? AND agent_id = ?",
    [agentCustomerId, agentId]
  );

  if (!check.length) return null;

  const [oldRows]: any = await db.query(
    "SELECT * FROM agent_customers WHERE id = ?",
    [agentCustomerId]
  );
  const oldValue = oldRows[0] ? { ...oldRows[0] } : null;

  // Logic to handle dates based on status
  const { followUpDate, followUpTime, doneDate } = parseDatesBasedOnStatus(data);
  const finalStatus = calculateFinalStatus(data.status_code);

  await db.query(
    `UPDATE agent_customers
     SET status_code = ?, final_status = ?, follow_up_date = ?, follow_up_time = ?, done_date = ?, remark = ?, rating = ?, configuration = ?, budget = ?, purpose = ?
     WHERE id = ?`,
    [
      data.status_code,
      finalStatus, 
      followUpDate, 
      followUpTime, 
      doneDate, // NEW FIELD
      data.remark,
      data.leadRating || data.lead_rating || data.rating,
      data.config || data.configuration,
      data.budget,
      data.purpose,
      agentCustomerId,
    ]
  );

  const [agentRow]: any = await db.query(
    `SELECT customer_id FROM agent_customers WHERE id = ?`,
    [agentCustomerId]
  );
  if (agentRow.length) {
    const customerId = agentRow[0].customer_id;
    if (data.name || data.location || data.pincode || data.profession || data.designation) {
      await db.query(
        `UPDATE customers SET name = ?, location = ?, pincode = ?, profession = ?, designation = ?, updated_at = NOW() WHERE id = ?`,
        [
          data.name,
          data.location,
          data.pincode,
          data.profession,
          data.designation,
          customerId,
        ]
      );
    } else {
      await db.query(
        `UPDATE customers SET updated_at = NOW() WHERE id = ?`,
        [customerId]
      );
    }
  }

  const [newRows]: any = await db.query(
    "SELECT * FROM agent_customers WHERE id = ?",
    [agentCustomerId]
  );
  const newValue = newRows[0] ? { ...newRows[0] } : null;

  await db.query(
    `INSERT INTO agent_customer_logs (agent_customer_id, agent_id, action_type, old_value, new_value)
     VALUES (?, ?, 'EDIT', ?, ?)` ,
    [agentCustomerId, agentId, JSON.stringify(oldValue), JSON.stringify(newValue)]
  );

  return newValue;
}

export async function getCustomerRemarkHistory(agentCustomerId: number) {
  const [rows]: any = await db.query(
    `SELECT created_at, new_value 
     FROM agent_customer_logs 
     WHERE agent_customer_id = ? 
     ORDER BY created_at DESC`,
    [agentCustomerId]
  );

  return rows.map((log: any) => {
    const data = JSON.parse(log.new_value);
    return {
      date: log.created_at,
      remark: data.remark || "No remark entered"
    };
  }).filter((item: any) => item.remark !== "No remark entered");
}

// --- DASHBOARD ANALYTICS ---

// 1. VISITS & BOOKINGS (Cards)
// Rule: VC, VP, VMC, VM -> Follow Up Date.
// Rule: BD, VD -> Done Date.
export async function getDashboardVisitsBooking(
  agentId: number,
  projectId: string,
  startDate: string,
  endDate: string
) {
  let filter = "";
  const params: any[] = [agentId];

  if (projectId && projectId !== "all") {
    filter += " AND c.project_id = ?";
    params.push(projectId);
  }

  // Double params for the two date checks
  const fullParams = [...params, startDate, endDate, startDate, endDate];

  const [rows]: any = await db.query(
    `
    SELECT status_code, COUNT(*) AS count
    FROM (
      SELECT ac.status_code
      FROM agent_customers ac
      JOIN customers c ON c.id = ac.customer_id
      WHERE ac.agent_id = ?
      ${filter}
      AND (
        -- Scenario A: Pipeline Statuses (Based on Follow Up Date)
        (
          ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet', 'virtual-meet-confirmed')
          AND ac.follow_up_date IS NOT NULL
          AND DATE(ac.follow_up_date) BETWEEN ? AND ?
        )
        OR
        -- Scenario B: Result Statuses (Based on Done Date)
        (
          ac.status_code IN ('visit-done','booking-done','lost')
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
// Rule: Logic kept as is (Log based) for now.
export async function getDashboardPipeline(
  agentId: number,
  startDate: string,
  endDate: string,
  mode: string = "all"
) {
  const [rows]: any = await db.query(
    `
    SELECT 
        ac.status_code,
        -- Alignment: MySQL WEEKDAY() is 0(Mon)-6(Sun). Add 1 to make it 1(Mon)-7(Sun).
        (WEEKDAY(ac.follow_up_date) + 1) AS day_num,
        
        -- STRICT FRESH: Status Created Date == Follow Up Date
        SUM(
            CASE 
                WHEN DATE(first_log.first_time) = DATE(ac.follow_up_date) THEN 1
                ELSE 0
            END
        ) AS fresh,

        -- STRICT REPEATED: Status Created Date < Follow Up Date
        SUM(
            CASE 
                WHEN DATE(first_log.first_time) < DATE(ac.follow_up_date) THEN 1
                ELSE 0
            END
        ) AS repeated

    FROM agent_customers ac
    
    -- Subquery to find the "Inception Date" using Logs
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

    WHERE ac.agent_id = ?
      AND ac.follow_up_date BETWEEN ? AND ?
      AND ac.status_code IN ('visit-proposed', 'visit-confirmed', 'virtual-meet-confirmed')
    
    -- Group by the CORRECTED day_num
    GROUP BY ac.status_code, day_num
    `,
    [agentId, startDate, endDate]
  );

  return rows;
}

// 3. TOTAL STATUS COUNTS (Matrix)
// Rule: BD/VD -> Done Date. Others -> Assigned Date.
// Rule: Week starts Mon=1 (WEEKDAY + 1).
export async function getDashboardStatusCounts(
  agentId: number,
  projectId: string,
  startDate: string,
  endDate: string
) {
  let filter = "";
  const params: any[] = [agentId];

  if (projectId && projectId !== "all") {
    filter += " AND c.project_id = ?";
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
            ELSE (WEEKDAY(ac.assigned_at) + 1) -- Using Assigned At as "Creation" for Agent
        END as day_num,
        COUNT(*) AS count
    FROM agent_customers ac
    JOIN customers c ON ac.customer_id = c.id
    WHERE ac.agent_id = ?
      AND ac.is_active = 1
      ${filter}
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

// Helper to get Assigned Projects for the Filter Dropdown
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

// ... existing imports

export async function getAgentFollowUps(agentId: number) {
  // Logic:
  // 1. Must have a follow_up_date
  // 2. Must NOT be 'lost'
  // 3. Must NOT be 'COMPLETED' (Visit Done / Booking Done)
  // 4. Sorted by Date ASC (Oldest/Overdue first) -> Then Time
  
  const [rows]: any = await db.query(
    `SELECT ac.id AS agent_customer_id, 
            ac.status_code, 
            ac.follow_up_date, 
            ac.follow_up_time,
            ac.remark,
            c.name, 
            c.contact, 
            c.location,
            p.name AS project_name
     FROM agent_customers ac
     JOIN customers c ON ac.customer_id = c.id
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE ac.agent_id = ? 
       AND ac.is_active = 1
       AND ac.follow_up_date IS NOT NULL
       AND ac.status_code != 'lost'
       AND ac.final_status != 'COMPLETED'
     ORDER BY ac.follow_up_date ASC, ac.follow_up_time ASC`,
    [agentId]
  );
  
  return rows;
}