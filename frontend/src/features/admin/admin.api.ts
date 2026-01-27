import axios from 'axios';
import { getToken } from '@/features/auth/auth.store';

const API_BASE = 'http://localhost:3000';

export async function createUser(payload: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: 'AGENT' | 'SUPERVISOR' | 'ADMIN';
}) {
  const token = getToken();

  await axios.post(`${API_BASE}/auth/users`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
