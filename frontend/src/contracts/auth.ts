export type UserRole = 'AGENT' | 'SUPERVISOR' | 'ADMIN';

export interface LoginRequest {
  username: string;
  password: string;
}