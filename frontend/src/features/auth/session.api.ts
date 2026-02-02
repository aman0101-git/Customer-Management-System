import axios from 'axios';
import type { UserRole } from '@/contracts/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface MeResponse {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: UserRole;
}

export async function fetchSession(): Promise<MeResponse | null> {
  try {
    const res = await axios.get(`${API_BASE}/auth/me`, { withCredentials: true });
    return res.data;
  } catch {
    return null;
  }
}
