import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getRole } from '@/features/auth/auth.store';
import type { UserRole } from '@/contracts/auth';

export default function RequireAuth({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const userRole = getRole();

  if (!userRole) return <Navigate to="/" replace />;
  if (userRole !== role) return <Navigate to="/" replace />;

  return children;
}
