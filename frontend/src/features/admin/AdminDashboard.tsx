// ============================================================================
// PHASE 3 — AdminDashboard
// ----------------------------------------------------------------------------
// Phase 8 user-overview logic preserved verbatim (lazy-load, metrics derivation,
// roster sort). Visual layer fully tokenized:
//   - PageHeader replaces the bare 3-card grid header.
//   - Card hover pile-on removed (Phase 1 Card owns the lift).
//   - System breakdown KPIs use StatTile.
//   - Activity bar uses semantic success/danger tokens.
//   - Roster table token-driven; role badge uses tokens.
//   - Close buttons on every Drawer.
// ============================================================================

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import RouteFallback from "@/components/system/RouteFallback";
import AccountabilityBadge from "@/components/system/AccountabilityBadge";
import {
  UserPlus,
  Settings,
  ClipboardList,
  Users,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Briefcase,
  X,
} from "lucide-react";
import CreateUserForm from "./CreateUserForm";
import PageHeader from "@/components/system/PageHeader";
import StatTile from "@/components/system/StatTile";

type AuditUser = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  is_active: number;
  supervisor_id: number | null;
  project_count: number;
};

type IconTone = "violet" | "info" | "danger";
const TONE_ICON_BG: Record<IconTone, string> = {
  violet: "bg-chart-4/15 text-chart-4",
  info:   "bg-info/15 text-info",
  danger: "bg-danger/15 text-danger",
};

const IconBadge = ({ tone, children }: { tone: IconTone; children: React.ReactNode }) => (
  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${TONE_ICON_BG[tone]}`}>
    {children}
  </span>
);

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<"CREATE_USER" | "SYSTEM_SETTINGS" | "AUDIT_LOGS" | null>(null);
  const { user, loading } = useAuth();

  const [auditUsers, setAuditUsers] = useState<AuditUser[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    if (activePanel !== "AUDIT_LOGS") return;
    if (auditUsers.length > 0) return;

    setAuditLoading(true);
    setAuditError(null);

    fetch(`${API_BASE}/api/users`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<AuditUser[]>;
      })
      .then((users) => { setAuditUsers(users); })
      .catch((err) => { setAuditError(err?.message || "Failed to load user data"); })
      .finally(() => setAuditLoading(false));
  }, [activePanel]);

  const auditMetrics = useMemo(() => {
    const agents      = auditUsers.filter(u => u.role?.toUpperCase() === "AGENT");
    const supervisors = auditUsers.filter(u => u.role?.toUpperCase() === "SUPERVISOR");
    const admins      = auditUsers.filter(u => u.role?.toUpperCase() === "ADMIN");
    const activeAgents     = agents.filter(u => u.is_active === 1);
    const inactiveAgents   = agents.filter(u => u.is_active === 0);
    const unassignedAgents = activeAgents.filter(u => u.project_count === 0);
    return { agents, supervisors, admins, activeAgents, inactiveAgents, unassignedAgents };
  }, [auditUsers]);

  const auditRoster = useMemo(() =>
    [...auditUsers].sort((a, b) => {
      if (b.is_active !== a.is_active) return b.is_active - a.is_active;
      return b.project_count - a.project_count;
    }),
    [auditUsers]
  );

  if (loading || !user) return <RouteFallback />;

  return (
    <AppShell sidebar={null}>
      <PageHeader
        title="Admin Console"
        description="Manage system users, configure permissions, and view audit data."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          accent="purple"
          className="cursor-pointer"
          onClick={() => setActivePanel("CREATE_USER")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActivePanel("CREATE_USER")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBadge tone="violet"><UserPlus className="w-5 h-5" /></IconBadge>
              Create User
            </CardTitle>
            <CardDescription>Create agents, supervisors, and admins</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="blue"
          className="cursor-pointer"
          onClick={() => setActivePanel("SYSTEM_SETTINGS")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActivePanel("SYSTEM_SETTINGS")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBadge tone="info"><Settings className="w-5 h-5" /></IconBadge>
              System Settings
            </CardTitle>
            <CardDescription>Configure system rules and permissions</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="red"
          className="cursor-pointer"
          onClick={() => setActivePanel("AUDIT_LOGS")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActivePanel("AUDIT_LOGS")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBadge tone="danger"><ClipboardList className="w-5 h-5" /></IconBadge>
              Audit Logs
            </CardTitle>
            <CardDescription>Track admin actions and system events</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Create User Drawer */}
      <Drawer open={activePanel === "CREATE_USER"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create User</DrawerTitle>
            <DrawerDescription>Create agents, supervisors, and admins</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">
            <CreateUserForm onSuccess={() => setActivePanel(null)} />
          </div>
          <DrawerClose asChild>
            <button
              aria-label="Close"
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {/* System Settings Drawer (stub) */}
      <Drawer open={activePanel === "SYSTEM_SETTINGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>System Settings</DrawerTitle>
            <DrawerDescription>Configure system rules and permissions</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 text-muted-foreground">System settings form goes here.</div>
          <DrawerClose asChild>
            <button
              aria-label="Close"
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {/* Audit Logs Drawer */}
      <Drawer open={activePanel === "AUDIT_LOGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh] flex flex-col">
          <DrawerHeader className="border-b border-border pb-4 shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-danger" />
              System User Overview
            </DrawerTitle>
            <DrawerDescription>
              Operational accountability snapshot — active agents, project assignments, and system user breakdown.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {auditLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
                <span className="text-sm text-muted-foreground">Loading user data...</span>
              </div>
            )}

            {auditError && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {auditError}
              </div>
            )}

            {!auditLoading && !auditError && auditUsers.length > 0 && (
              <>
                {/* System Breakdown KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatTile label="Total Users" value={auditUsers.length} icon={Users} />
                  <StatTile label="Agents"      value={auditMetrics.agents.length}      tone="info"   icon={ShieldCheck} />
                  <StatTile label="Supervisors" value={auditMetrics.supervisors.length} tone="info"   icon={Users} />
                  <StatTile
                    label="Unassigned"
                    value={auditMetrics.unassignedAgents.length}
                    tone={auditMetrics.unassignedAgents.length > 0 ? "warning" : "default"}
                    icon={auditMetrics.unassignedAgents.length > 0 ? AlertTriangle : Briefcase}
                  />
                </div>

                {/* Agent Activity Bar */}
                {auditMetrics.agents.length > 0 && (
                  <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 p-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agent Active Rate</span>
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {auditMetrics.activeAgents.length} active / {auditMetrics.inactiveAgents.length} inactive
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted">
                      {auditMetrics.activeAgents.length > 0 && (
                        <div
                          className="bg-success transition-all duration-500"
                          style={{ width: `${(auditMetrics.activeAgents.length / auditMetrics.agents.length) * 100}%` }}
                        />
                      )}
                      {auditMetrics.inactiveAgents.length > 0 && (
                        <div
                          className="bg-danger/70 transition-all duration-500"
                          style={{ width: `${(auditMetrics.inactiveAgents.length / auditMetrics.agents.length) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 tabular-nums">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-success inline-block" />
                        <span className="text-muted-foreground font-medium">Active</span>
                        <span className="text-foreground">{auditMetrics.activeAgents.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-danger/70 inline-block" />
                        <span className="text-muted-foreground font-medium">Inactive</span>
                        <span className="text-foreground">{auditMetrics.inactiveAgents.length}</span>
                      </div>
                      {auditMetrics.unassignedAgents.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                          <span className="text-warning font-bold">No Projects</span>
                          <span className="text-warning/80">{auditMetrics.unassignedAgents.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full User Roster Table */}
                <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All System Users</span>
                  </div>
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm text-left tabular-nums-tracking">
                      <thead className="sticky top-0 bg-muted/60 border-b border-border">
                        <tr>
                          {["User", "Role", "Status", "Projects", "Accountability"].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {auditRoster.map((u) => {
                          const isAgent = u.role?.toUpperCase() === "AGENT";
                          const isUnassigned = isAgent && u.is_active === 1 && u.project_count === 0;
                          const roleCls =
                            u.role?.toUpperCase() === "AGENT"      ? "bg-brand/10 text-brand border-brand/30" :
                            u.role?.toUpperCase() === "SUPERVISOR" ? "bg-chart-4/10 text-chart-4 border-chart-4/30" :
                            "bg-muted text-muted-foreground border-border";

                          return (
                            <tr
                              key={u.id}
                              className={`transition-colors ${
                                u.is_active === 0
                                  ? "bg-muted/30 opacity-70"
                                  : isUnassigned
                                  ? "bg-warning/5 border-l-4 border-l-warning/60"
                                  : "hover:bg-accent/40"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">{u.first_name} {u.last_name}</div>
                                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">@{u.username}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wide ${roleCls}`}>
                                  {u.role || "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${u.is_active ? "bg-success" : "bg-muted-foreground/60"}`} />
                                  <span className={`text-xs font-semibold ${u.is_active ? "text-success" : "text-muted-foreground"}`}>
                                    {u.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isAgent ? (
                                  <span className={`text-sm font-bold ${u.project_count > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                                    {u.project_count}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isUnassigned && <AccountabilityBadge signal="unassigned" />}
                                {u.is_active === 0 && isAgent && <AccountabilityBadge signal="inactive" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <DrawerClose asChild>
            <button
              aria-label="Close"
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

    </AppShell>
  );
}
