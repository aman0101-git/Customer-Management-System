import { db } from "../../config/db.js";
import { ResultSetHeader } from "mysql2";
import { UserRole } from "../auth/auth.types.js"; // Adjust import path as needed

// List all agents, with assignment status for a project
export async function getProjectAgentsService(projectId: number, supervisorId: number, role?: string) {
  // If ADMIN, we don't filter by supervisor_id. If SUPERVISOR, we do.
  let query = `
    SELECT 
      u.id,
      u.first_name,
      u.last_name,
      u.username,
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

  if (role !== 'ADMIN') {
    query += ` AND u.supervisor_id = ?`;
    params.push(supervisorId);
  }

  const [rows] = await db.query(query, params);
  return rows;
}

// Assign a single agent to a project
export async function assignAgentToProjectService(
  projectId: number,
  agentId: number,
  currentUser: any
) {
  // 1. Verify project ownership (unless admin)
  if (currentUser.role !== "ADMIN") {
    const [proj]: any = await db.query(
      `SELECT id FROM projects WHERE id = ? AND created_by = ?`,
      [projectId, currentUser.id]
    );
    if (!proj.length) throw new Error("FORBIDDEN_PROJECT");
  }

  // 2. Verify agent belongs to supervisor (unless admin)
  if (currentUser.role !== "ADMIN") {
    const [agent]: any = await db.query(
      `SELECT id FROM users WHERE id = ? AND supervisor_id = ? AND role='AGENT'`,
      [agentId, currentUser.id]
    );
    if (!agent.length) throw new Error("FORBIDDEN_AGENT");
  }

  // 3. Upsert assignment
  await db.query(
    `INSERT INTO user_projects (user_id, project_id, assigned_at, is_active)
      VALUES (?, ?, NOW(), 1)
      ON DUPLICATE KEY UPDATE is_active=1, assigned_at=NOW()`,
    [agentId, projectId]
  );
}

// Unassign a single agent from a project
export async function unassignAgentFromProjectService(projectId: number, userId: number) {
  await db.query(`
    UPDATE user_projects SET is_active=0
    WHERE user_id=? AND project_id=?
  `, [userId, projectId]);
}

// FIX: Now accepts userId and role to filter visibility
export async function getAllProjectsWithAgentsService(userId: number, role: string) {
  let query = `
    SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.status,
      GROUP_CONCAT(u.username) as agents
    FROM projects p
    LEFT JOIN user_projects up ON p.id = up.project_id AND up.is_active = 1
    LEFT JOIN users u ON up.user_id = u.id AND u.role = 'AGENT'
    WHERE p.is_active = 1
  `;

  const params: any[] = [];

  // If Supervisor, only show projects they created
  if (role === 'SUPERVISOR') {
    query += ` AND p.created_by = ?`;
    params.push(userId);
  }

  query += ` GROUP BY p.id`;

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