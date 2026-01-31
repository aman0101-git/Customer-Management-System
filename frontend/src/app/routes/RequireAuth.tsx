import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth.context';
import type { UserRole } from '@/contracts/auth';
import { getMe } from '@/features/auth/auth.api';
import { useState, useEffect } from 'react';

export default function RequireAuth({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const { token } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setUserRole(null);
      setLoading(false);
      return;
    }
    getMe(token)
      .then((user: { role: UserRole }) => setUserRole(user.role))
      .catch(() => setUserRole(null))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return null; // or a spinner
  if (!userRole) return <Navigate to="/" replace />;
  if (userRole !== role) return <Navigate to="/" replace />;

  return children;
}
