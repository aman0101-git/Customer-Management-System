import type { UserRole } from '@/contracts/auth';

const ROLE_KEY = 'ams_role';

export function setAuth(role: UserRole) {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  localStorage.removeItem(ROLE_KEY);
}

export function getRole(): UserRole | null {
  return localStorage.getItem(ROLE_KEY) as UserRole | null;
}

// Deprecated: Do not use these. Use AuthProvider context for JWT and role.
