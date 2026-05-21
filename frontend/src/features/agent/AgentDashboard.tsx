
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import RouteFallback from "@/components/system/RouteFallback";
import {
  ChartNoAxesCombined,
  Users,
  AlarmClock,
  Search,
} from "lucide-react";

export default function AgentDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading || !user) return <RouteFallback />;
  return (
    <AppShell sidebar={null}>
      {/* Customer Lookup CTA — uses Link for SPA navigation (no full-page reload) */}
      <div className="flex justify-center items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
        <Link
          to="/agent/customers/resolve"
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-full shadow-md hover:shadow-indigo-200 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
        >
          <Search className="w-5 h-5" />
          <span>Customer Lookup</span>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 w-full px-6">
        <Card accent="blue" className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" onClick={() => navigate("/agent/customers")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> My Customers</CardTitle>
            <CardDescription>View and manage your customers</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="yellow" className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" onClick={() => navigate("/agent/followups")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlarmClock className="w-5 h-5" /> My Follow-ups</CardTitle>
            <CardDescription>Your scheduled follow-ups</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="purple" className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" onClick={() => navigate("/agent/summary")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ChartNoAxesCombined className="w-5 h-5" /> Summary Dashboards</CardTitle>
            <CardDescription>Quick view of today's activity</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  );
}
