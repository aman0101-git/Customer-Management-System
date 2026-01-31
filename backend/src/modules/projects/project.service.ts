import { db } from "../../config/db.js";
import { ResultSetHeader } from "mysql2";

// List all agents, with assignment status for a project
export async function getProjectAgentsService(projectId: number, supervisorId: number) {
  const [rows] = await db.query(`
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
      AND u.supervisor_id = ?
  `, [projectId, supervisorId]);
  return rows;
}

// Assign a single agent to a project
export async function assignAgentToProjectService(projectId: number, userId: number) {
  // Upsert: set is_active=1 if exists, else insert
  await db.query(`
    INSERT INTO user_projects (user_id, project_id, assigned_at, is_active)
    VALUES (?, ?, NOW(), 1)
    ON DUPLICATE KEY UPDATE is_active=1, assigned_at=NOW()
  `, [userId, projectId]);
}

// Unassign a single agent from a project
export async function unassignAgentFromProjectService(projectId: number, userId: number) {
  await db.query(`
    UPDATE user_projects SET is_active=0
    WHERE user_id=? AND project_id=?
  `, [userId, projectId]);
}

export async function getAllProjectsWithAgentsService() {
  const [rows] = await db.query(`
    SELECT p.id, p.name, p.description, p.start_date, p.end_date, p.status,
      GROUP_CONCAT(u.username) as agents
    FROM projects p
    LEFT JOIN user_projects up ON p.id = up.project_id AND up.is_active = 1
    LEFT JOIN users u ON up.user_id = u.id AND u.role = 'AGENT'
    WHERE p.is_active = 1
    GROUP BY p.id
  `);
  return rows;
}

export async function createProjectService(data: {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
}) {
  const { name, description, start_date, end_date, status } = data;
  const [result] = await db.query(
    `INSERT INTO projects (name, description, start_date, end_date, status, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [name, description, start_date, end_date, status]
  ) as [ResultSetHeader, any];
  return { id: result.insertId, ...data };
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

// (Removed bulk assignment service)
