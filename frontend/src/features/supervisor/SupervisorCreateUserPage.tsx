import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import CreateUserForm from "../admin/CreateUserForm";
import ConfirmDialog from "@/components/system/ConfirmDialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Users, UserPlus, Search, ShieldCheck, Briefcase, X, Filter } from "lucide-react";
import AgentProjectAllocationDrawer from "./AgentProjectAllocationDrawer";
import { useAuth } from "@/context/AuthContext";

// Phase 3 (May 2026):
//   - Replaced window.confirm + alert in the deactivate flow with the new
//     ConfirmDialog primitive + sonner toasts.
//   - Wrapped the status-toggle PATCH in useMutation so the button reflects
//     in-flight state and failures surface a Retry action.
//   - Invalidates ['supervisor','agents'] on success so the supervisor
//     dashboard's cached agent picklist refreshes.
//   - The allocation drawer (AgentProjectAllocationDrawer) is intentionally
//     untouched — allocation engine is out of scope for Phase 3.

type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  project_count: number;
  is_active: number;
  supervisor_id: number;
};

// UI Helper: Avatar Generator
const UserAvatar = ({ first, last }: { first: string; last: string }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
    {first?.[0]}{last?.[0]}
  </div>
);

// UI Helper: Role Badge
const RoleBadge = ({ role }: { role: string }) => {
  const isAgent = role?.toUpperCase() === "AGENT";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
      isAgent
        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
        : "bg-slate-50 text-slate-700 border-slate-200"
    }`}>
      {isAgent && <ShieldCheck className="w-3 h-3" />}
      {role || "N/A"}
    </span>
  );
};

export default function SupervisorCreateUserPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [agents, setAgents] = useState<User[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // State for Project Management Drawer
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);

  // Phase 3: confirm-dialog state for deactivate/activate.
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const loadAgents = () => {
    if (!user?.id) return;

    fetch(`${API_BASE}/api/users`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((users: User[]) => {
        const myAgents = users.filter(u => u.role?.toUpperCase() === 'AGENT');
        setAgents(myAgents);
      })
      .catch(err => console.error("Failed to load users:", err));
  };

  useEffect(() => {
    if (user?.id) {
      loadAgents();
    }
  }, [user?.id]);

  // Phase 3: toggle-status mutation. Preserves the exact backend contract.
  const toggleStatusMutation = useMutation({
    mutationFn: async (target: User) => {
      const res = await fetch(`${API_BASE}/api/users/${target.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !target.is_active }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to update status");
      }
      return target;
    },
    onSuccess: (target) => {
      const actionPast = target.is_active ? "deactivated" : "activated";
      toast.success(`${target.first_name} ${target.last_name} ${actionPast}`);
      loadAgents();
      queryClient.invalidateQueries({ queryKey: ["supervisor", "agents"] });
      setConfirmTarget(null);
    },
    onError: (err: any, target) => {
      toast.error(err?.message || "Failed to update status", {
        action: {
          label: "Retry",
          onClick: () => toggleStatusMutation.mutate(target),
        },
      });
    },
  });

  // Handle Opening Project Drawer
  const handleManageProjects = (agent: User) => {
    setSelectedAgent(agent);
    setProjectDrawerOpen(true);
  };

  // Filter and Sort logic (Active users on top)
  const filteredAgents = agents
    .filter(agent =>
      agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.is_active - a.is_active); // Sorts 1 (Active) before 0 (Inactive)

  const togglePending =
    toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === confirmTarget?.id;

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                  <Users className="w-6 h-6 text-white" />
                </div>
                My Team Management
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1 ml-1">
                Monitor performance and manage credentials for your assigned agents.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 active:scale-95"
              onClick={() => setDrawerOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Onboard New Agent
            </button>
          </div>

          {/* Controls & Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="pl-3 pr-2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search your agents by name or username..."
                className="w-full h-10 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="border-l border-slate-100 pl-2">
                <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">My Agents</span>
              <span className="text-2xl font-black text-indigo-600">{agents.length}</span>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
            <div className="overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Agent Profile</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Role</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Assignments</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-24">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Users className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-slate-900 font-bold">No agents found</h3>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or create a new agent.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((u) => {
                      const rowPending =
                        toggleStatusMutation.isPending &&
                        toggleStatusMutation.variables?.id === u.id;
                      return (
                        <tr key={u.id} className={`transition-colors group ${!u.is_active ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50/80'}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <UserAvatar first={u.first_name} last={u.last_name} />
                              <div>
                                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  {u.first_name} {u.last_name}
                                  {!u.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold border border-red-200">INACTIVE</span>}
                                </div>
                                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              <span className={`text-xs font-bold ${u.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                                {u.is_active ? 'Active' : 'Deactivated'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              {u.project_count > 0 ? (
                                <span className="font-bold text-slate-700">{u.project_count} Projects</span>
                              ) : (
                                <span className="text-slate-400 italic text-xs">No assignments</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            {/* New Inline Buttons */}
                            <button
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors mr-2 disabled:opacity-60 disabled:cursor-not-allowed"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManageProjects(u);
                              }}
                              disabled={rowPending}
                            >
                              Manage Projects
                            </button>
                            <button
                              className={`font-bold text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                u.is_active
                                  ? "text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100"
                                  : "text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmTarget(u);
                              }}
                              disabled={rowPending}
                            >
                              {rowPending ? "..." : u.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Agent Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-w-xl ml-auto h-full rounded-l-2xl border-l border-slate-200 shadow-2xl bg-white flex flex-col focus:outline-none">
            <DrawerHeader className="flex items-center justify-between border-b border-slate-100 px-8 py-6 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <DrawerTitle className="text-xl font-bold text-slate-900">Onboard New Agent</DrawerTitle>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Create credentials for a new team member.</p>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-8 py-8 bg-white">
              <div className="bg-white p-1 rounded-2xl">
                {/* When the form succeeds it closes the drawer and triggers
                    loadAgents() so the table reflects the new agent. The
                    cached ['supervisor','agents'] query is invalidated
                    automatically by CreateUserForm's onSuccess. */}
                <CreateUserForm
                  allowedRoles={['AGENT']}
                  onSuccess={() => {
                    setDrawerOpen(false);
                    loadAgents();
                  }}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Agent Project Management Drawer */}
        <AgentProjectAllocationDrawer
          open={projectDrawerOpen}
          onClose={() => {
            setProjectDrawerOpen(false);
            loadAgents(); // Refresh count on close
          }}
          agent={selectedAgent}
        />

        {/* Phase 3: confirm dialog for activate/deactivate (replaces window.confirm) */}
        <ConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(open) => {
            if (!open) setConfirmTarget(null);
          }}
          title={
            confirmTarget
              ? `${confirmTarget.is_active ? "Deactivate" : "Activate"} ${confirmTarget.first_name} ${confirmTarget.last_name}?`
              : ""
          }
          description={
            confirmTarget
              ? confirmTarget.is_active
                ? `${confirmTarget.first_name} will lose access to the system. Their assignments stay attached and you can reactivate them at any time.`
                : `${confirmTarget.first_name} will regain access to the system.`
              : undefined
          }
          confirmLabel={confirmTarget?.is_active ? "Deactivate" : "Activate"}
          tone={confirmTarget?.is_active ? "destructive" : "default"}
          pending={togglePending}
          onConfirm={() => {
            if (confirmTarget) toggleStatusMutation.mutate(confirmTarget);
          }}
        />

      </div>
    </AppShell>
  );
}
