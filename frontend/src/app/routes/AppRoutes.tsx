import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from './RequireAuth';
import AuthLayout from '../layouts/AuthLayout';
import AdminDashboard from '@/features/admin/AdminDashboard';
import AgentDashboard from '@/features/agent/AgentDashboard';
import CustomerResolvePage from '@/features/agent/CustomerResolvePage';
import AgentCustomersPage from '@/features/agent/AgentCustomersPage';
import SupervisorDashboard from '@/features/supervisor/SupervisorDashboard';
import SupervisorCreateUserPage from '@/features/supervisor/SupervisorCreateUserPage';
import ProjectAllocationPage from '@/features/supervisor/ProjectAllocationPage';
import SummaryDashboard from '@/features/agent/SummaryDashboard';
import FollowUpDashboard from '@/features/agent/FollowUpDashboard';
import SupervisorSummaryDashboard from '@/features/supervisor/SupervisorSummaryDashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <LoginPage />
          </AuthLayout>
        }
      />
      <Route
        path="/"
        element={<Navigate to="/login"/>}
      />

      <Route
        path="/admin/dashboard"
        element={
          <RequireAuth role="ADMIN">
            <AdminDashboard />
          </RequireAuth>
        }
      />

      {/* AGENT ROUTES */}
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
        path="/agent/followups"
        element={
          <RequireAuth role="AGENT">
            <FollowUpDashboard />
          </RequireAuth>
        }
      />

      {/* FIXED: Moved inside RequireAuth role="AGENT" */}
      <Route 
        path="/agent/summary" 
        element={
          <RequireAuth role="AGENT">
            <SummaryDashboard />
          </RequireAuth>
        } 
      />
      
      {/* SUPERVISOR ROUTES */}
      <Route
        path="/supervisor/dashboard"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorDashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/supervisor/create-user"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorCreateUserPage />
          </RequireAuth>
        }
      />
      <Route
        path="/supervisor/project-allocation"
        element={
          <RequireAuth role="SUPERVISOR">
            <ProjectAllocationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/supervisor/summarydashboard"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorSummaryDashboard />
          </RequireAuth>
        }
      />
    </Routes>
  );
}