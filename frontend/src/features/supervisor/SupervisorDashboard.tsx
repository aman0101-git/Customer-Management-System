// ============================================================================
// PHASE 3 — SupervisorDashboard
// ----------------------------------------------------------------------------
// Mirrors AgentDashboard treatment:
//   - PageHeader replaces the bare card grid.
//   - Card hover pile-on (transition-all hover:scale-[1.02] shadow-sm hover:shadow-md)
//     removed — the Phase 1 Card primitive owns the lift/elevation behaviour.
//   - Tokenized icon containers per card tone for hierarchy.
// All routes and navigate() calls preserved.
// ============================================================================

import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { useNavigate } from "react-router-dom";
import RouteFallback from "@/components/system/RouteFallback";
import PageHeader from "@/components/system/PageHeader";
import {
  FileSpreadsheet,
  Users,
  FolderKanban,
  CalendarClock,
  BarChart3,
  Search,
  MessageCircle,
  Clock,
} from "lucide-react";

type IconTone = "violet" | "pink" | "warning" | "info" | "success" | "danger" | "brand";
const TONE_ICON_BG: Record<IconTone, string> = {
  violet:  "bg-chart-4/15 text-chart-4",
  pink:    "bg-chart-5/15 text-chart-5",
  warning: "bg-warning/15 text-warning",
  info:    "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  danger:  "bg-danger/15 text-danger",
  brand:   "bg-brand/15 text-brand",
};

const IconBadge = ({ tone, children }: { tone: IconTone; children: React.ReactNode }) => (
  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${TONE_ICON_BG[tone]}`}>
    {children}
  </span>
);

export default function SupervisorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading || !user) return <RouteFallback />;

  const tiles: Array<{
    accent: "purple" | "pink" | "yellow" | "blue" | "green" | "red";
    tone: IconTone;
    icon: React.ReactNode;
    title: string;
    description: string;
    path: string;
  }> = [
    { accent: "purple", tone: "violet",  icon: <Users className="w-5 h-5" />,           title: "Agent Management",   description: "Create and manage agents", path: "/supervisor/create-user" },
    { accent: "pink",   tone: "pink",    icon: <FolderKanban className="w-5 h-5" />,    title: "Project Allocation", description: "Create projects and allocate to agents", path: "/supervisor/project-allocation" },
    { accent: "yellow", tone: "warning", icon: <CalendarClock className="w-5 h-5" />,   title: "Follow-up Discipline", description: "Overdue and upcoming follow-ups", path: "/supervisor/follow-ups" },
    { accent: "blue",   tone: "info",    icon: <BarChart3 className="w-5 h-5" />,       title: "Summary Dashboards", description: "Quick view of Agents' activity", path: "/supervisor/summarydashboard" },
    { accent: "green",  tone: "success", icon: <FileSpreadsheet className="w-5 h-5" />, title: "Export Data",        description: "Download CSV/Excel reports", path: "/supervisor/export-data" },
    { accent: "red",    tone: "danger",  icon: <Search className="w-5 h-5" />,          title: "Global Lead Search", description: "Search any customer and view assignment details", path: "/supervisor/customer-search" },
    { accent: "yellow", tone: "warning", icon: <MessageCircle className="w-5 h-5" />,   title: "WhatsApp Templates", description: "Create and manage WhatsApp message templates", path: "/supervisor/whatsapp/templates" },
    { accent: "purple", tone: "violet",  icon: <Clock className="w-5 h-5" />,           title: "WhatsApp Audit Log", description: "View and manage WhatsApp audit logs", path: "/supervisor/whatsapp/audit" },
  ];

  return (
    <AppShell sidebar={null}>
      <PageHeader
        eyebrow={`${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
        title={`Welcome back, ${user.first_name}`}
        description="Manage your team, allocate projects, and monitor operations."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <Card
            key={tile.path}
            accent={tile.accent}
            className="cursor-pointer"
            onClick={() => navigate(tile.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(tile.path)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconBadge tone={tile.tone}>{tile.icon}</IconBadge>
                {tile.title}
              </CardTitle>
              <CardDescription>{tile.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
