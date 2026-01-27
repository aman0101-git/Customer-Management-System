import type { UserRole } from '@/contracts/auth';

const TOKEN_KEY = 'ams_token';
const ROLE_KEY = 'ams_role';

export function setAuth(token: string, role: UserRole) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): UserRole | null {
  return localStorage.getItem(ROLE_KEY) as UserRole | null;
}
