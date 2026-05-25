// auth.api.ts
import axios from 'axios';
import type { LoginRequest } from '@/contracts/auth';

const API_BASE = 'http://192.168.1.14:3000';

export async function login(payload: LoginRequest): Promise<void> {
  await axios.post(
    `${API_BASE}/auth/login`,
    payload,
    { withCredentials: true }
  );
}
