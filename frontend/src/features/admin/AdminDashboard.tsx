import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import RouteFallback from "@/components/system/RouteFallback";
import AccountabilityBadge from "@/components/system/AccountabilityBadge";
import { UserPlus, Settings, ClipboardList, Users, ShieldCheck, AlertTriangle, Loader2, Briefcase } from "lucide-react";
import CreateUserForm from "./CreateUserForm";

// Phase 8 (May 2026):
//   Replaces the empty "Audit logs content goes here" stub with a live
//   operational user-overview panel. Data source: existing GET /api/users
//   endpoint — no new backend endpoints or schema changes required.
//
//   Panel surfaces:
//     - System-wide user count breakdown (total / agents / supervisors / admins)
//     - Active vs inactive agent ratio with visual bar
//     - Unassigned agents (active but project_count === 0) — highest-signal concern
//     - Full user roster sorted: active first, then by project load

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

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<"CREATE_USER" | "SYSTEM_SETTINGS" | "AUDIT_LOGS" | null>(null);
  const { user, loading } = useAuth();

  // Phase 8: User overview state for Audit Logs panel.
  // Fetched lazily when the panel opens — avoids unnecessary network call on dashboard load.
  const [auditUsers, setAuditUsers] = useState<AuditUser[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    if (activePanel !== "AUDIT_LOGS") return;
    if (auditUsers.length > 0) return; // Already loaded — don't refetch on re-open

    setAuditLoading(true);
    setAuditError(null);

    fetch(`${API_BASE}/api/users`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<AuditUser[]>;
      })
      .then((users) => {
        setAuditUsers(users);
      })
      .catch((err) => {
        setAuditError(err?.message || "Failed to load user data");
      })
      .finally(() => setAuditLoading(false));
  }, [activePanel]);

  // Derived accountability metrics — all computed from the fetched users array.
  const auditMetrics = useMemo(() => {
    const agents      = auditUsers.filter(u => u.role?.toUpperCase() === "AGENT");
    const supervisors = auditUsers.filter(u => u.role?.toUpperCase() === "SUPERVISOR");
    const admins      = auditUsers.filter(u => u.role?.toUpperCase() === "ADMIN");
    const activeAgents    = agents.filter(u => u.is_active === 1);
    const inactiveAgents  = agents.filter(u => u.is_active === 0);
    const unassignedAgents = activeAgents.filter(u => u.project_count === 0);
    return { agents, supervisors, admins, activeAgents, inactiveAgents, unassignedAgents };
  }, [auditUsers]);

  // Display roster: all users sorted active-first, then by project_count desc
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
      {/* Dashboard Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          accent="purple"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => setActivePanel("CREATE_USER")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Create User
            </CardTitle>
            <CardDescription>Create agents, supervisors, and admins</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="blue"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => setActivePanel("SYSTEM_SETTINGS")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> System Settings
            </CardTitle>
            <CardDescription>Configure system rules and permissions</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="red"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => setActivePanel("AUDIT_LOGS")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Audit Logs
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
          <CreateUserForm onSuccess={() => setActivePanel(null)} />
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">&#x2715;</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {/* System Settings Drawer (stub — no backend endpoint yet) */}
      <Drawer open={activePanel === "SYSTEM_SETTINGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>System Settings</DrawerTitle>
            <DrawerDescription>Configure system rules and permissions</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 text-slate-500">System settings form goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">&#x2715;</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {/* Audit Logs Drawer — Phase 8: operational user overview panel */}
      <Drawer open={activePanel === "AUDIT_LOGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh] flex flex-col">
          <DrawerHeader className="border-b border-slate-100 pb-4 shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-rose-500" />
              System User Overview
            </DrawerTitle>
            <DrawerDescription>
              Operational accountability snapshot — active agents, project assignments, and system user breakdown.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {auditLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm text-slate-400">Loading user data...</span>
              </div>
            )}

            {auditError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {auditError}
              </div>
            )}

            {!auditLoading && !auditError && auditUsers.length > 0 && (
              <>
                {/* System Breakdown KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Users</div>
                      <div className="text-2xl font-black text-slate-800 mt-0.5">{auditUsers.length}</div>
                    </div>
                    <Users className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Agents</div>
                      <div className="text-2xl font-black text-indigo-600 mt-0.5">{auditMetrics.agents.length}</div>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Supervisors</div>
                      <div className="text-2xl font-black text-violet-600 mt-0.5">{auditMetrics.supervisors.length}</div>
                    </div>
                    <Users className="w-6 h-6 text-violet-200" />
                  </div>
                  <div className={`rounded-xl border shadow-sm px-4 py-3 flex items-center justify-between ${
                    auditMetrics.unassignedAgents.length > 0
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-slate-200"
                  }`}>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        {auditMetrics.unassignedAgents.length > 0 && (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        )}
                        Unassigned
                      </div>
                      <div className={`text-2xl font-black mt-0.5 ${
                        auditMetrics.unassignedAgents.length > 0 ? "text-amber-600" : "text-slate-300"
                      }`}>
                        {auditMetrics.unassignedAgents.length}
                      </div>
                    </div>
                    <Briefcase className={`w-6 h-6 ${
                      auditMetrics.unassignedAgents.length > 0 ? "text-amber-300" : "text-slate-200"
                    }`} />
                  </div>
                </div>

                {/* Agent Activity Bar */}
                {auditMetrics.agents.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Agent Active Rate</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {auditMetrics.activeAgents.length} active / {auditMetrics.inactiveAgents.length} inactive
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-100">
                      {auditMetrics.activeAgents.length > 0 && (
                        <div
                          className="bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(auditMetrics.activeAgents.length / auditMetrics.agents.length) * 100}%` }}
                        />
                      )}
                      {auditMetrics.inactiveAgents.length > 0 && (
                        <div
                          className="bg-rose-300 transition-all duration-500"
                          style={{ width: `${(auditMetrics.inactiveAgents.length / auditMetrics.agents.length) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-slate-500 font-medium">Active</span>
                        <span className="text-slate-400">{auditMetrics.activeAgents.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-rose-300 inline-block" />
                        <span className="text-slate-500 font-medium">Inactive</span>
                        <span className="text-slate-400">{auditMetrics.inactiveAgents.length}</span>
                      </div>
                      {auditMetrics.unassignedAgents.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          <span className="text-amber-700 font-bold">No Projects</span>
                          <span className="text-amber-500">{auditMetrics.unassignedAgents.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full User Roster Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">All System Users</span>
                  </div>
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm text-left">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">User</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Role</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Projects</th>
                          <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Accountability</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditRoster.map((u) => {
                          const isAgent = u.role?.toUpperCase() === "AGENT";
                          const isUnassigned = isAgent && u.is_active === 1 && u.project_count === 0;
                          return (
                            <tr
                              key={u.id}
                              className={`transition-colors ${
                                u.is_active === 0
                                  ? "bg-slate-50 opacity-70"
                                  : isUnassigned
                                  ? "bg-amber-50/40 border-l-4 border-l-amber-300"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{u.first_name} {u.last_name}</div>
                                <div className="text-[11px] text-slate-400 uppercase tracking-wide">@{u.username}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wide ${
                                  u.role?.toUpperCase() === "AGENT"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                    : u.role?.toUpperCase() === "SUPERVISOR"
                                    ? "bg-violet-50 text-violet-700 border-violet-100"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}>
                                  {u.role || "N/A"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                  <span className={`text-xs font-semibold ${u.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                                    {u.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isAgent ? (
                                  <span className={`text-sm font-bold ${u.project_count > 0 ? "text-slate-700" : "text-slate-300"}`}>
                                    {u.project_count}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">&#x2014;</span>
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
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">&#x2715;</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

    </AppShell>
  );
}
