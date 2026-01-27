import axios from 'axios';
import type { LoginRequest, LoginResponse } from '@/contracts/auth.ts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await axios.post<LoginResponse>(
    `${API_BASE}/auth/login`,
    payload
  );
  return res.data;
}
