import { Request, Response } from 'express';
import { db } from '../../config/db.js';
import * as AuthService from './auth.service.js';

export async function getMe(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = user.userId;
    const [rows] = await db.query<any[]>(
      'SELECT id, first_name, last_name, username, role FROM users WHERE id = ?',
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: (err as Error).message });
  }
}


export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  try {
    const result = await AuthService.login(username, password);
    // Set JWT as HTTP-only cookie for local dev
    res.cookie('token', result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false
    });
    // Return both token and role for frontend
    res.json({ token: result.token, role: result.role });
  } catch {
    res.status(401).json({ message: 'Invalid credentials' });
  }
}

export async function createUser(req: Request, res: Response) {
  const { firstName, lastName, username, password, role } = req.body;
  const adminId = (req as any).user.userId;
  try {
    await AuthService.createUser(
      adminId,
      firstName,
      lastName,
      username,
      password,
      role
    );
    res.status(201).json({ message: 'User created' });
  } catch (err: any) {
    if (err.status === 403) {
      return res.status(403).json({ message: err.message });
    }
    res.status(400).json({ message: err.message || 'Failed to create user' });
  }
}
