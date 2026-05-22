// ============================================================================
// PHASE 3 — SupervisorCreateUserPage
// ----------------------------------------------------------------------------
// All Phase 3/8/10 logic preserved verbatim:
//   - useMutation status toggle, queryClient invalidation, sonner toasts
//   - active/inactive/unassigned accountability metrics derivation
//   - active/inactive/all filter, search query
//   - ConfirmDialog flow, AgentProjectAllocationDrawer integration
//
// Visual changes:
//   - PageHeader + token-driven primary CTA replace the ad-hoc header.
//   - Accountability tiles use StatTile.
//   - Search/filter bar tokenized.
//   - StatusBadge / RoleBadge use semantic tokens.
//   - Table surfaces use token system.
//   - EmptyState helper replaces the inline no-data block.
// ============================================================================

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import CreateUserForm from "../admin/CreateUserForm";
import ConfirmDialog from "@/components/system/ConfirmDialog";
import AccountabilityBadge from "@/components/system/AccountabilityBadge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Users, UserPlus, Search, ShieldCheck, Briefcase, X, AlertTriangle } from "lucide-react";
import AgentProjectAllocationDrawer from "./AgentProjectAllocationDrawer";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/system/PageHeader";
import StatTile from "@/components/system/StatTile";
import EmptyState from "@/components/system/EmptyState";

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

const UserAvatar = ({ first, last }: { first: string; last: string }) => (
  <div className="w-10 h-10 rounded-full bg-brand/15 text-brand border border-brand/30 flex items-center justify-center font-bold text-sm">
    {first?.[0]}{last?.[0]}
  </div>
);

const RoleBadge = ({ role }: { role: string }) => {
  const isAgent = role?.toUpperCase() === "AGENT";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
      isAgent
        ? "bg-brand/10 text-brand border-brand/30"
        : "bg-muted text-muted-foreground border-border"
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);

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
    if (user?.id) loadAgents();
  }, [user?.id]);

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

  const handleManageProjects = (agent: User) => {
    setSelectedAgent(agent);
    setProjectDrawerOpen(true);
  };

  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch =
        agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && agent.is_active === 1) ||
        (statusFilter === "inactive" && agent.is_active === 0);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.is_active - a.is_active);

  const togglePending =
    toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === confirmTarget?.id;

  const accountabilityMetrics = useMemo(() => {
    const active     = agents.filter(a => a.is_active === 1).length;
    const inactive   = agents.filter(a => a.is_active === 0).length;
    const unassigned = agents.filter(a => a.is_active === 1 && a.project_count === 0).length;
    return { active, inactive, unassigned };
  }, [agents]);

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto space-y-6">

        <PageHeader
          title="My Team Management"
          description="Monitor performance and manage credentials for your assigned agents."
          actions={
            <Button onClick={() => setDrawerOpen(true)} className="gap-2" size="lg">
              <UserPlus className="w-4 h-4" />
              Onboard New Agent
            </Button>
          }
        />

        {/* Search + filter row + count tile */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 bg-card text-card-foreground p-1.5 rounded-xl border border-border shadow-elevation-1 flex items-center gap-2">
            <div className="pl-3 pr-2 text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search your agents by name or username..."
              className="flex-1 h-10 outline-none text-sm text-foreground placeholder:text-muted-foreground bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center border-l border-border pl-2 gap-1">
              {(["all", "active", "inactive"] as const).map((opt) => {
                const active = statusFilter === opt;
                let cls = "text-muted-foreground hover:bg-accent/60";
                if (active) {
                  if (opt === "active") cls = "bg-success text-success-foreground";
                  else if (opt === "inactive") cls = "bg-muted-foreground/80 text-background";
                  else cls = "bg-brand text-brand-foreground";
                }
                return (
                  <button
                    key={opt}
                    onClick={() => setStatusFilter(opt)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-elevation-1 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Agents</span>
            <span className="text-2xl font-black text-brand tabular-nums">{agents.length}</span>
          </div>
        </div>

        {/* Accountability tiles */}
        {agents.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              label="Active"
              value={accountabilityMetrics.active}
              tone="success"
              icon={ShieldCheck}
            />
            <StatTile
              label="Inactive"
              value={accountabilityMetrics.inactive}
              tone={accountabilityMetrics.inactive > 0 ? "danger" : "default"}
              icon={X}
            />
            <StatTile
              label="Unassigned"
              value={accountabilityMetrics.unassigned}
              tone={accountabilityMetrics.unassigned > 0 ? "warning" : "default"}
              icon={accountabilityMetrics.unassigned > 0 ? AlertTriangle : Briefcase}
            />
          </div>
        )}

        {/* Roster table */}
        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-elevation-1 overflow-visible">
          <div className="overflow-visible">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  {["Agent Profile", "Status", "Role", "Assignments"].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={Users}
                        title="No agents found"
                        description="Try adjusting your search or onboard a new agent."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((u) => {
                    const rowPending =
                      toggleStatusMutation.isPending &&
                      toggleStatusMutation.variables?.id === u.id;
                    return (
                      <tr key={u.id} className={`transition-colors group ${
                        !u.is_active
                          ? "bg-muted/30 opacity-75"
                          : u.project_count === 0
                          ? "hover:bg-warning/5 border-l-4 border-l-warning/60"
                          : "hover:bg-accent/40"
                      }`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <UserAvatar first={u.first_name} last={u.last_name} />
                            <div>
                              <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                {u.first_name} {u.last_name}
                                {!u.is_active && (
                                  <span className="text-[10px] bg-danger/10 text-danger px-1.5 rounded font-bold border border-danger/30">INACTIVE</span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${u.is_active ? "bg-success" : "bg-muted-foreground/60"}`} />
                            <span className={`text-xs font-bold ${u.is_active ? "text-success" : "text-muted-foreground"}`}>
                              {u.is_active ? "Active" : "Deactivated"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Briefcase className="w-4 h-4" />
                            {u.project_count > 0 ? (
                              <span className="font-bold text-foreground tabular-nums">
                                {u.project_count} Project{u.project_count !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground italic text-xs">No assignments</span>
                                {u.is_active === 1 && <AccountabilityBadge signal="unassigned" />}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleManageProjects(u); }}
                            disabled={rowPending}
                            className="text-brand border-brand/30 hover:bg-brand/10 mr-2"
                          >
                            Manage Projects
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setConfirmTarget(u); }}
                            disabled={rowPending}
                            className={u.is_active
                              ? "bg-danger/10 text-danger hover:bg-danger/15"
                              : "bg-success/10 text-success hover:bg-success/15"}
                            variant="ghost"
                          >
                            {rowPending ? "..." : u.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Agent Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-w-xl ml-auto h-full rounded-l-2xl border-l border-border shadow-elevation-4 bg-popover text-popover-foreground flex flex-col focus:outline-none">
            <DrawerHeader className="flex items-center justify-between border-b border-border px-8 py-6 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand/15 text-brand rounded-xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <DrawerTitle className="text-xl font-bold text-foreground">Onboard New Agent</DrawerTitle>
                  <p className="text-sm text-muted-foreground font-medium mt-0.5">Create credentials for a new team member.</p>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-8 py-8 bg-popover">
              <CreateUserForm
                allowedRoles={['AGENT']}
                onSuccess={() => {
                  setDrawerOpen(false);
                  loadAgents();
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>

        <AgentProjectAllocationDrawer
          open={projectDrawerOpen}
          onClose={() => {
            setProjectDrawerOpen(false);
            loadAgents();
          }}
          agent={selectedAgent}
        />

        <ConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
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
