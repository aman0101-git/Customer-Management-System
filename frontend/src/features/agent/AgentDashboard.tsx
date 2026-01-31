
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";

export default function AgentDashboard() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Session expired. Please log in again.</div>;
  return (
    <AppShell sidebar={null} user={user} onLogout={logout}>
      <div className="flex justify-center items-center mb-8 border-b border-slate-100 pb-6">
        <a
          href="/agent/customers/resolve"
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-full shadow-md hover:shadow-indigo-200 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
          </svg>
          <span>Customer Lookup</span>
        </a>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 w-full px-6">
        <Card accent="blue" className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" onClick={() => navigate("/agent/customers") }>
          <CardHeader>
            <CardTitle>🏠 My Customers</CardTitle>
            <CardDescription>View and manage your customers</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="pink" className="cursor-pointer" onClick={() => navigate("/agent/visits") }>
          <CardHeader>
            <CardTitle>📍 My Visits</CardTitle>
            <CardDescription>Manage visit lifecycle</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="yellow" className="cursor-pointer" onClick={() => navigate("/agent/followups") }>
          <CardHeader>
            <CardTitle>⏰ My Follow-ups</CardTitle>
            <CardDescription>Your scheduled follow-ups</CardDescription>
          </CardHeader>
        </Card>
        <Card accent="green" className="cursor-pointer" onClick={() => navigate("/agent/attendance") }>
          <CardHeader>
            <CardTitle>🕒 My Attendance</CardTitle>
            <CardDescription>Login / Logout for today</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="purple" className="cursor-pointer" onClick={() => navigate("/agent/summary") }>
          <CardHeader>
            <CardTitle>📊 Today’s Summary</CardTitle>
            <CardDescription>Quick view of today’s activity</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
