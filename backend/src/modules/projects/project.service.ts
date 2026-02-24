import { db } from "../../config/db.js";
import { ResultSetHeader } from "mysql2";

// 1. UPDATED: List all agents, strictly filtered by supervisor
export async function getProjectAgentsService(projectId: number, supervisorId: number, role?: string) {
  let query = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.username,
      u.supervisor_id,
      CASE 
        WHEN up.id IS NOT NULL AND up.is_active = 1 THEN 1 
        ELSE 0 
      END AS assigned
    FROM users u
    LEFT JOIN user_projects up 
      ON up.user_id = u.id 
      AND up.project_id = ?
    WHERE 
      u.role = 'AGENT'
      AND u.is_active = 1
  `;
  
  const params: any[] = [projectId];

  // THE LOCK: Only filter by supervisor_id if the user is a Supervisor
  if (role?.toUpperCase() === 'SUPERVISOR') {
    query += ` AND u.supervisor_id = ?`;
    params.push(supervisorId);
  }

  query += ` ORDER BY u.first_name ASC`;

  const [rows]: any = await db.query(query, params);
  
  // Convert MySQL 1/0 into proper true/false booleans for React
  return rows.map((row: any) => ({
    ...row,
    assigned: row.assigned === 1
  }));
}

// Assign a single agent to a project
export async function assignAgentToProjectService(
  projectId: number,
  agentId: number,
  currentUser: any
) {
  if (currentUser.role !== "ADMIN") {
    const [proj]: any = await db.query(
      `SELECT id FROM projects WHERE id = ? AND created_by = ?`,
      [projectId, currentUser.id]
    );
    if (!proj.length) throw new Error("FORBIDDEN_PROJECT");
  }

  const [agent]: any = await db.query(
    `SELECT id FROM users WHERE id = ? AND role='AGENT'`,
    [agentId]
  );
  if (!agent.length) throw new Error("INVALID_AGENT");

  await db.query(
    `INSERT INTO user_projects (user_id, project_id, assigned_at, is_active)
      VALUES (?, ?, NOW(), 1)
      ON DUPLICATE KEY UPDATE is_active=1, assigned_at=NOW()`,
    [agentId, projectId]
  );
}

export async function unassignAgentFromProjectService(projectId: number, userId: number) {
  await db.query(`
    UPDATE user_projects SET is_active=0
    WHERE user_id=? AND project_id=?
  `, [userId, projectId]);
}

// FIX: Added logic for AGENT role to fetch their assigned projects
export async function getAllProjectsWithAgentsService(userId: number, role: string) {
  let query = "";
  const params: any[] = [];

  if (role === 'AGENT') {
    // Agents see projects they are assigned to
    query = `
      SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.status,
             1 as agent_count, -- Dummy count for consistency, or calculate real count if needed
             up.assigned_at
      FROM projects p
      JOIN user_projects up ON p.id = up.project_id
      WHERE up.user_id = ? AND up.is_active = 1 AND p.is_active = 1
      ORDER BY up.assigned_at DESC
    `;
    params.push(userId);
  } else {
    // Supervisors/Admins view
    // FIX: Changed GROUP_CONCAT(u.username) to COUNT(u.id)
    query = `
      SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.status,
        COUNT(u.id) as agent_count
      FROM projects p
      LEFT JOIN user_projects up ON p.id = up.project_id AND up.is_active = 1
      LEFT JOIN users u ON up.user_id = u.id AND u.role = 'AGENT'
      WHERE p.is_active = 1
    `;
    
    if (role === 'SUPERVISOR') {
      query += ` AND p.created_by = ?`;
      params.push(userId);
    }
    
    query += ` GROUP BY p.id`;
  }

  const [rows] = await db.query(query, params);
  return rows;
}

export async function createProjectService(
  data: {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
  },
  createdBy: number
) {
  const { name, description, start_date, end_date, status } = data;

  const [result]: any = await db.query(
    `INSERT INTO projects 
      (name, description, start_date, end_date, status, is_active, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
    [name, description, start_date, end_date, status, createdBy]
  );

  return {
    id: result.insertId,
    ...data,
    created_by: createdBy,
  };
}

export async function updateProjectService(
  id: number,
  data: {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
  }
) {
  const { name, description, start_date, end_date, status } = data;
  await db.query(
    `UPDATE projects SET name=?, description=?, start_date=?, end_date=?, status=?, updated_at=NOW() WHERE id=?`,
    [name, description, start_date, end_date, status, id]
  );
  return { id, ...data };
}