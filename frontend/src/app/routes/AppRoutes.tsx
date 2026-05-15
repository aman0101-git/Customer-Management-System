import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/features/auth/LoginPage';
import RequireAuth from './RequireAuth';
import AuthLayout from '../layouts/AuthLayout';
import AdminDashboard from '@/features/admin/AdminDashboard';
import AgentDashboard from '@/features/agent/AgentDashboard';
import CustomerResolvePage from '@/features/agent/CustomerResolvePage';
import AgentCustomersPage from '@/features/agent/AgentCustomersPage';
import SummaryDashboard from '@/features/agent/SummaryDashboard';
import FollowUpDashboard from '@/features/agent/FollowUpDashboard';

// Supervisor Imports
import SupervisorDashboard from '@/features/supervisor/SupervisorDashboard';
import SupervisorCreateUserPage from '@/features/supervisor/SupervisorCreateUserPage';
import ProjectAllocationPage from '@/features/supervisor/ProjectAllocationPage';
import SupervisorSummaryDashboard from '@/features/supervisor/SupervisorSummaryDashboard';
import SupervisorFollowUpPage from '@/features/supervisor/SupervisorFollowUpPage';
import SupervisorExportPage from '@/features/supervisor/SupervisorExportPage';
import GlobalCustomerSearch from '@/features/supervisor/GlobalCustomerSearch';
import WhatsAppTemplateManagement from '@/features/supervisor/WhatsAppTemplateManagement';
import SupervisorWhatsAppAudit from '@/features/supervisor/SupervisorWhatsAppAudit';

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
      <Route
        path="/supervisor/follow-ups"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorFollowUpPage />
          </RequireAuth>
        }
      />
      <Route
        path="/supervisor/export-data"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorExportPage />
          </RequireAuth>
        }
      />      <Route
        path="/supervisor/whatsapp/audit"
        element={
          <RequireAuth role="SUPERVISOR">
            <SupervisorWhatsAppAudit />
          </RequireAuth>
        }
      />      
      <Route
        path="/supervisor/customer-search"
        element={
          <RequireAuth role="SUPERVISOR">
            <GlobalCustomerSearch />
          </RequireAuth>
        }
      />
      
      <Route
        path="/supervisor/whatsapp/templates"
        element={
          <RequireAuth role="SUPERVISOR">
            <WhatsAppTemplateManagement />
          </RequireAuth>
        }
      />
      
    </Routes>
  );
}