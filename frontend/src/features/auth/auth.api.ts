import axios from 'axios';
import type { LoginRequest, UserRole } from '@/contracts/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function login(payload: LoginRequest): Promise<{ token: string; role: UserRole }> {
  const res = await axios.post(`${API_BASE}/auth/login`, payload);
  return res.data;
}

export async function getMe(token: string): Promise<{ id: number; first_name: string; last_name: string; username: string; role: UserRole }> {
  const res = await axios.get(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
