import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@/contracts/auth';
import { useAuth } from '@/context/AuthContext';
import RouteFallback from '@/components/system/RouteFallback';

// Phase 0 (May 2026):
//   Swapped the bare "<div>Loading...</div>" for a styled centered fallback.
//   Conditions and redirects are unchanged.
export default function RequireAuth({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/unauthorized" replace />;

  return children;
}
