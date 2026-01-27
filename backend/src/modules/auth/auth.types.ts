export type UserRole = 'AGENT' | 'SUPERVISOR' | 'ADMIN';

export interface JwtPayload {
  userId: number;
  role: UserRole;
}
