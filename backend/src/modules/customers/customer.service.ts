import {db} from "../../config/db.js";

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

  // Step 2: Check if assigned to this agent
  const [assignments]: any = await db.query(
    `SELECT ac.*, c.name, c.contact
     FROM agent_customers ac
     JOIN customers c ON c.id = ac.customer_id
     WHERE ac.agent_id = ? AND ac.customer_id = ?`,
    [agentId, customerId]
  );

  return assignments.length ? assignments[0] : null;
}

export async function createAgentCustomer(agentId: number, data: any) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Step 1: Find or create customer
    const [existing]: any = await conn.query(
      "SELECT id FROM customers WHERE contact = ?",
      [data.contact]
    );

    let customerId;

    if (existing.length) {
      customerId = existing[0].id;
    } else {
      const [result]: any = await conn.query(
        "INSERT INTO customers (name, contact) VALUES (?, ?)",
        [data.name, data.contact]
      );
      customerId = result.insertId;
    }

    // Step 2: Assign customer to agent
    const [assignment]: any = await conn.query(
      `INSERT INTO agent_customers
       (agent_id, customer_id, source, rating, budget, configuration, purpose,
        status_code, follow_up_date, follow_up_time, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        customerId,
        data.source,
        data.rating,
        data.budget,
        data.configuration,
        data.purpose,
        data.status_code,
        data.follow_up_date,
        data.follow_up_time,
        data.remark,
      ]
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

  await db.query(
    `UPDATE agent_customers
     SET status_code = ?, follow_up_date = ?, follow_up_time = ?, remark = ?
     WHERE id = ?`,
    [
      data.status_code,
      data.follow_up_date,
      data.follow_up_time,
      data.remark,
      agentCustomerId,
    ]
  );

  const [updated]: any = await db.query(
    "SELECT * FROM agent_customers WHERE id = ?",
    [agentCustomerId]
  );

  return updated[0];
}
