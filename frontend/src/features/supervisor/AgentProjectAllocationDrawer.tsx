// ============================================================================
// PHASE 3 — AgentProjectAllocationDrawer
// ----------------------------------------------------------------------------
// Backend contract (POST /api/users/:id/projects assign/unassign) preserved.
// Visual layer fully tokenized.
// ============================================================================

import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Briefcase, Plus, Minus, FolderOpen, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/system/EmptyState";

interface Project {
  id: number;
  name: string;
  is_assigned: boolean;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
}

export default function AgentProjectAllocationDrawer({
  open,
  onClose,
  agent,
}: {
  open: boolean;
  onClose: () => void;
  agent: User | null;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const refreshProjects = () => {
    if (agent?.id) {
      fetch(`${API_BASE}/api/users/${agent.id}/projects`, { credentials: "include" })
        .then(res => {
          if (!res.ok) throw new Error("Failed");
          return res.json();
        })
        .then(setProjects)
        .catch(() => setProjects([]));
    }
  };

  useEffect(() => {
    if (open) refreshProjects();
  }, [open, agent?.id]);

  const handleAssignment = async (projectId: number, action: "assign" | "unassign") => {
    setLoadingId(projectId);
    try {
      await fetch(`${API_BASE}/api/users/${agent?.id}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ project_id: projectId, action }),
      });
      refreshProjects();
    } catch (error) {
      console.error("Assignment failed", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!agent) return null;

  const assignedProjects = projects.filter(p => p.is_assigned);
  const availableProjects = projects.filter(p => !p.is_assigned);

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DrawerContent className="max-w-2xl ml-auto h-full rounded-l-2xl border-l border-border shadow-elevation-4 bg-popover text-popover-foreground flex flex-col focus:outline-none">

        <DrawerHeader className="flex items-center justify-between border-b border-border px-8 py-6 bg-muted/30 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-chart-4/15 text-chart-4 rounded-xl shadow-elevation-1">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold text-foreground">
                Project Access
              </DrawerTitle>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                Assigning projects to:{" "}
                <span className="text-chart-4 font-bold bg-chart-4/10 px-2 py-0.5 rounded border border-chart-4/30">
                  {agent.first_name} {agent.last_name}
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
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Active Assignments ({assignedProjects.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {assignedProjects.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border bg-card">
                  <EmptyState
                    icon={FolderOpen}
                    title="No projects assigned yet"
                    description="Pick from the available pool below to assign their first project."
                  />
                </div>
              ) : (
                assignedProjects.map(project => (
                  <div key={project.id} className="group flex items-center justify-between p-4 bg-card text-card-foreground border border-success/30 shadow-elevation-1 rounded-xl hover:shadow-elevation-2 transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-success/15 text-success flex items-center justify-center border border-success/30">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-foreground">{project.name}</span>
                    </div>
                    <button
                      onClick={() => handleAssignment(project.id, "unassign")}
                      disabled={loadingId === project.id}
                      className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Revoke Access"
                    >
                      {loadingId === project.id ? (
                        <div className="w-5 h-5 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Minus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="hairline" />

          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Available Projects ({availableProjects.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {availableProjects.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm italic">
                  All your projects are already assigned to this agent.
                </div>
              ) : (
                availableProjects.map(project => (
                  <div key={project.id} className="group flex items-center justify-between p-4 bg-card text-card-foreground border border-border shadow-elevation-1 rounded-xl hover:border-chart-4/30 hover:shadow-elevation-2 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center group-hover:bg-chart-4/15 group-hover:text-chart-4 transition-colors">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-foreground transition-colors">{project.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAssignment(project.id, "assign")}
                      disabled={loadingId === project.id}
                      className="gap-1.5"
                    >
                      {loadingId === project.id ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Assign
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
