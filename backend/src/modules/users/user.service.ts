import { db } from "../../config/db.js";

// 1. Get All Users with Project Count & Active Status
export async function getAllUsersWithProjectsService() {
  const [rows] = await db.query(`
    SELECT 
      u.id, 
      u.first_name, 
      u.last_name, 
      u.username, 
      u.role, 
      u.is_active, -- Added active status
      COUNT(p.id) as project_count -- Changed to Count
    FROM users u
    LEFT JOIN user_projects up ON u.id = up.user_id AND up.is_active = 1
    LEFT JOIN projects p ON up.project_id = p.id AND p.is_active = 1
    GROUP BY u.id
  `);
  return rows;
}

// 2. Toggle Active Status
export async function toggleUserStatusService(userId: number, isActive: boolean) {
  await db.query(
    `UPDATE users SET is_active = ? WHERE id = ?`,
    [isActive ? 1 : 0, userId]
  );
  return { id: userId, is_active: isActive };
}

// 3. Get Projects for "Manage" Drawer (Filtered by Supervisor)
export async function getSupervisorProjectsForAgentService(supervisorId: number, agentId: number) {
  // This query gets ALL projects created by the logged-in Supervisor.
  // It checks if the specific 'agentId' is assigned to them.
  const [rows] = await db.query(`
    SELECT 
      p.id, 
      p.name,
      CASE 
        WHEN up.id IS NOT NULL AND up.is_active = 1 THEN 1 
        ELSE 0 
      END as is_assigned
    FROM projects p
    LEFT JOIN user_projects up ON p.id = up.project_id AND up.user_id = ?
    WHERE p.created_by = ? AND p.is_active = 1
    ORDER BY p.created_at DESC
  `, [agentId, supervisorId]);
  
  return rows;
}

// 4. Assign/Unassign Project (With Ownership Check)
export async function manageAgentProjectAssignmentService(
  supervisorId: number, 
  agentId: number, 
  projectId: number, 
  action: 'assign' | 'unassign'
) {
  // Security: Ensure Supervisor OWNS the project they are assigning
  const [projectCheck]: any = await db.query(
    `SELECT id FROM projects WHERE id = ? AND created_by = ?`,
    [projectId, supervisorId]
  );

  if (!projectCheck.length) {
    throw new Error("FORBIDDEN_PROJECT"); // Supervisor doesn't own this project
  }

  if (action === 'assign') {
    await db.query(
      `INSERT INTO user_projects (user_id, project_id, assigned_at, is_active)
       VALUES (?, ?, NOW(), 1)
       ON DUPLICATE KEY UPDATE is_active = 1, assigned_at = NOW()`,
      [agentId, projectId]
    );
  } else {
    await db.query(
      `UPDATE user_projects SET is_active = 0 WHERE user_id = ? AND project_id = ?`,
      [agentId, projectId]
    );
  }
}