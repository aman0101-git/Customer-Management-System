import { useEffect, useState } from "react";
import { API_BASE } from "@/apiBase";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/features/auth/auth.context';

export default function SupervisorDashboard() {
  const { token } = useAuth();
  const [user, setUser] = useState<{ first_name?: string }>({});
  useEffect(() => {
    if (!token) return setUser({});
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setUser(data))
      .catch(() => setUser({}));
  }, [token]);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const navigate = useNavigate();

  return (
    <AppShell sidebar={null} user={user} onLogout={logout}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 w-full px-6">
        <Card
          accent="purple"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => navigate("/supervisor/create-user")}
        >
          <CardHeader>
            <CardTitle>👤Agent Management</CardTitle>
            <CardDescription>
              Create and manage agents
            </CardDescription>
          </CardHeader>
        </Card>
        <Card accent="blue" className="cursor-pointer" onClick={() => navigate("/supervisor/project-allocation") }>
          <CardHeader>
            <CardTitle>👥 Project Allocation</CardTitle>
            <CardDescription>Create projects and allocate to agents</CardDescription>
          </CardHeader>
        </Card>
        <Card accent="pink" className="cursor-pointer" onClick={() => {}}>
          <CardHeader>
            <CardTitle>📍 Visits Monitoring</CardTitle>
            <CardDescription>Track visits across agents</CardDescription>
          </CardHeader>
        </Card>
        <Card accent="yellow" className="cursor-pointer" onClick={() => {}}>
          <CardHeader>
            <CardTitle>⏰ Follow-up Discipline</CardTitle>
            <CardDescription>Overdue and upcoming follow-ups</CardDescription>
          </CardHeader>
        </Card>
        <Card accent="green" className="cursor-pointer" onClick={() => {}}>
          <CardHeader>
            <CardTitle>🕒 Attendance Monitoring</CardTitle>
            <CardDescription>Login / logout and work hours</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
