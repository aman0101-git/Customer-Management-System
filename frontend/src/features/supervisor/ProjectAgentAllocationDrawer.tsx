// ============================================================================
// PHASE 3 — ProjectAgentAllocationDrawer
// ----------------------------------------------------------------------------
// Phase 0 double-lock security filter (SUPERVISOR sees only their own agents)
// preserved verbatim. Visual layer tokenized.
// ============================================================================

import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Users, UserPlus, UserMinus, User as UserIcon, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/system/EmptyState";

interface Agent {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  assigned: boolean;
  supervisor_id: number;
  role?: string;
}

interface Project {
  id: number;
  name: string;
}

export default function ProjectAgentAllocationDrawer({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
}) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const refreshAgents = () => {
    if (project?.id && user?.id) {
      fetch(`${API_BASE}/api/projects/${project.id}/agents`, { credentials: "include" })
        .then(res => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((allAgents: Agent[]) => {
          const currentUserId = Number(user.id);
          const currentUserRole = user.role?.toUpperCase();
          const myAgents = allAgents.filter(a => {
            if (currentUserRole === "SUPERVISOR") {
              return Number(a.supervisor_id) === currentUserId;
            }
            return true;
          });
          setAgents(myAgents);
        })
        .catch(() => setAgents([]));
    }
  };

  useEffect(() => {
    if (open) refreshAgents();
  }, [open, project?.id, user?.id]);

  const handleAssign = async (agentId: number) => {
    setAssigning(agentId);
    await fetch(`${API_BASE}/api/projects/${project?.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: agentId }),
    });
    refreshAgents();
    setAssigning(null);
  };

  const handleUnassign = async (agentId: number) => {
    setAssigning(agentId);
    await fetch(`${API_BASE}/api/projects/${project?.id}/unassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ user_id: agentId }),
    });
    refreshAgents();
    setAssigning(null);
  };

  if (!project) return null;

  const assignedAgents = agents.filter(a => a.assigned);
  const unassignedAgents = agents.filter(a => !a.assigned);

  return (
    <Drawer open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <DrawerContent className="max-w-4xl ml-auto h-full rounded-l-2xl border-l border-border shadow-elevation-4 bg-popover text-popover-foreground flex flex-col focus:outline-none">

        <DrawerHeader className="flex items-center justify-between border-b border-border px-8 py-6 bg-muted/30 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand/15 text-brand rounded-xl shadow-elevation-1">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold text-foreground">
                Team Allocation
              </DrawerTitle>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                Managing agents for:{" "}
                <span className="text-brand font-bold bg-brand/10 px-2 py-0.5 rounded border border-brand/30">
                  {project.name}
                </span>
              </p>
            </div>
          </div>
          <DrawerClose asChild>
            <button className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Assigned Team ({assignedAgents.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedAgents.length === 0 ? (
                <div className="col-span-full rounded-2xl border-2 border-dashed border-border bg-card">
                  <EmptyState
                    icon={UserMinus}
                    title="No agents currently assigned"
                    description="Pick from the available pool below to staff this project."
                  />
                </div>
              ) : (
                assignedAgents.map(agent => (
                  <div key={agent.id} className="group flex items-center justify-between p-4 bg-card text-card-foreground border border-success/30 shadow-elevation-1 rounded-xl hover:shadow-elevation-2 transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-success/15 text-success flex items-center justify-center font-bold text-sm shrink-0 border border-success/30">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{agent.first_name} {agent.last_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{agent.username}</div>
                      </div>
                    </div>
                    <button
                      className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove from project"
                      disabled={assigning === agent.id}
                      onClick={() => handleUnassign(agent.id)}
                    >
                      {assigning === agent.id ? (
                        <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserMinus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="hairline" />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                Available Pool ({unassignedAgents.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedAgents.length === 0 ? (
                <div className="col-span-full py-8 text-center text-muted-foreground text-sm italic">
                  All available agents have been assigned.
                </div>
              ) : (
                unassignedAgents.map(agent => (
                  <div key={agent.id} className="group flex items-center justify-between p-4 bg-card text-card-foreground border border-border shadow-elevation-1 rounded-xl hover:border-brand/40 hover:shadow-elevation-2 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-brand/15 group-hover:text-brand transition-colors">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate transition-colors">
                          {agent.first_name} {agent.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{agent.username}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={assigning === agent.id}
                      onClick={() => handleAssign(agent.id)}
                      className="gap-1.5"
                    >
                      {assigning === agent.id ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Add</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </DrawerContent>
    </Drawer>
  );
}
