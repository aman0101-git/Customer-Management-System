import {db} from "../../config/db.js";

// Get merged customer + agent_customer for edit
export async function getAgentCustomerMerged(agentCustomerId: number, agentId: number) {
  const [rows]: any = await db.query(
    `SELECT ac.id, ac.status_code,
            ac.follow_up_date,
            ac.follow_up_time,
            ac.remark, ac.assigned_at,
            ac.rating,
            ac.configuration AS config,
            ac.budget, ac.purpose, ac.source,
            c.name, c.contact as phone, c.location, c.pincode, c.profession, c.designation, 
            c.project_id,
            c.updated_at, c.created_at AS created_at
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
  // Step 1: Check if customer exists globally
  const [customers]: any = await db.query(
    "SELECT id, name, contact FROM customers WHERE contact = ?",
    [phone]
  );

  if (!customers.length) return null;

  const customerId = customers[0].id;

  // Step 2: Check if assigned to this agent AND fetch all details
  const [assignments]: any = await db.query(
    `SELECT ac.*, ac.follow_up_date, ac.follow_up_time, 
            ac.source, ac.rating, ac.budget, ac.configuration, ac.purpose,
            c.name, c.contact, c.location, c.pincode, c.project_id, c.profession,
            p.name as project_name
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE ac.agent_id = ? AND ac.customer_id = ?`,
    [agentId, customerId]
  );

  return assignments.length ? assignments[0] : null;
}

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

    // FIX: Handle empty strings for Date/Time fields
    let followUpDate = null;
    if (data.follow_up_date && data.follow_up_date !== "") {
      try {
        followUpDate = new Date(data.follow_up_date).toISOString().slice(0, 10);
      } catch {}
    }

    let followUpTime = null;
    if (data.follow_up_time && data.follow_up_time !== "") {
      try {
        // Dummy date to parse time
        const t = new Date(`1970-01-01T${data.follow_up_time}`);
        // Check for invalid date
        if (!isNaN(t.getTime())) {
             followUpTime = t.toTimeString().slice(0, 8);
        }
      } catch {}
    }

    const [assignment]: any = await conn.query(
      `INSERT INTO agent_customers
       (agent_id, customer_id, source, rating, budget, configuration, purpose,
        status_code, follow_up_date, follow_up_time, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        customerId,
        data.source,
        data.leadRating || data.lead_rating || data.rating,
        data.budget,
        data.config || data.configuration,
        data.purpose,
        data.status_code,
        followUpDate, // Passes NULL if empty
        followUpTime, // Passes NULL if empty
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

  // FIX: Handle empty strings for Date/Time fields
  let followUpDate = null;
  if (data.follow_up_date && data.follow_up_date !== "") {
    try {
       followUpDate = new Date(data.follow_up_date).toISOString().slice(0, 10);
    } catch {}
  }

  let followUpTime = null;
  if (data.follow_up_time && data.follow_up_time !== "") {
    try {
      const t = new Date(`1970-01-01T${data.follow_up_time}`);
      if (!isNaN(t.getTime())) {
        followUpTime = t.toTimeString().slice(0, 8);
      }
    } catch {}
  }

  await db.query(
    `UPDATE agent_customers
     SET status_code = ?, follow_up_date = ?, follow_up_time = ?, remark = ?, rating = ?, configuration = ?, budget = ?, purpose = ?
     WHERE id = ?`,
    [
      data.status_code,
      followUpDate, // Passes NULL if empty
      followUpTime, // Passes NULL if empty
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