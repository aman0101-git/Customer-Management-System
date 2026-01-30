import { Routes, Route } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from './RequireAuth';
import AuthLayout from '../layouts/AuthLayout';
import AdminDashboard from '@/features/admin/AdminDashboard';
import AgentDashboard from '@/features/agent/AgentDashboard';
import CustomerResolvePage from '@/features/agent/CustomerResolvePage';
import AgentCustomersPage from '@/features/agent/AgentCustomersPage';
import SupervisorDashboard from '@/features/supervisor/SupervisorDashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <RequireAuth role="ADMIN">
            <AdminDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/agent/dashboard"
        element={
          <RequireAuth role="AGENT">
            <AgentDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/agent/customers/resolve"
        element={
          <RequireAuth role="AGENT">
            <CustomerResolvePage />
          </RequireAuth>
        }
      />
      
      <Route
        path="/agent/customers"
        element={
          <RequireAuth role="AGENT">
            <AgentCustomersPage />
          </RequireAuth>
        }
      />
      
      <Route
        path="/supervisor/dashboard"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorDashboard />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
