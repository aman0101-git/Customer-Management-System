import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/contracts/auth';
import { useAuth } from '@/context/AuthContext';

export default function RequireAuth({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/unauthorized" replace />;

  return children;
}
