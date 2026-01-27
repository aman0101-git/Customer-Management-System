import axios from 'axios';
import type { LoginRequest, UserRole } from '@/contracts/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function login(payload: LoginRequest): Promise<{ role: UserRole }> {
  const res = await axios.post(
    `${API_BASE}/auth/login`,
    payload,
    { withCredentials: true }
  );
  return res.data;
}
