import {db} from "../../config/db.js";

export async function getAllUsersWithProjectsService() {
  // Adjust query for your DB library (this is for Sequelize or similar)
  const [rows] = await db.query(`
    SELECT 
      u.id, u.first_name, u.last_name, u.username, u.role,
      GROUP_CONCAT(p.name) as projects
    FROM users u
    LEFT JOIN user_projects up ON u.id = up.user_id AND up.is_active = 1
    LEFT JOIN projects p ON up.project_id = p.id AND p.is_active = 1
    GROUP BY u.id
  `);
  return rows;
}
