
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

export async function createUser(payload: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: 'AGENT' | 'SUPERVISOR' | 'ADMIN';
}, token: string) {
  await axios.post(`${API_BASE}/auth/users`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });
}
