import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db.js';
import type { JwtPayload, UserRole } from './auth.types.js';

export async function login(username: string, password: string) {
  const [rows] = await db.query<any[]>(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [username]
  );

  if (rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '8h',
  });

  return {
    token,
    role: user.role,
  };
}

export async function createUser(
  adminId: number,
  firstName: string,
  lastName: string,
  username: string,
  password: string,
  role: UserRole
) {

  // Fetch the role of the user making the request
  const [rows] = await db.query<any[]>(
    'SELECT role FROM users WHERE id = ?',
    [adminId]
  );
  if (!rows.length) throw new Error('Requesting user not found');
  const requesterRole = rows[0].role;

  if (requesterRole === 'ADMIN') {
  // Admin can create any role
  } else if (requesterRole === 'SUPERVISOR') {
    if (role !== 'AGENT') {
      const err: any = new Error('Supervisors can only create agents');
      err.status = 403;
      throw err;
    }
  } else {
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  const hash = await bcrypt.hash(password, 10);

  await db.query(
    `INSERT INTO users 
     (first_name, last_name, username, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [firstName, lastName, username, hash, role]
  );
}
