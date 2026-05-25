// ============================================================================
// PHASE 3 — ProjectAllocationPage
// ----------------------------------------------------------------------------
// All Phase 3 mutation/invalidation logic preserved. Visual layer tokenized:
//   - PageHeader + design-system primary CTA.
//   - Table surfaces token-driven.
//   - ProjectStatusBadge uses semantic tones (success/info/muted).
//   - Empty-state replaced by helper.
//   - Manage Team / Deactivate buttons use design-system Button variants.
// ============================================================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import ProjectFormDrawer from "./ProjectFormDrawer";
import ProjectAgentAllocationDrawer from "./ProjectAgentAllocationDrawer";
import ConfirmDialog from "@/components/system/ConfirmDialog";
import { Users, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/system/PageHeader";
import EmptyState from "@/components/system/EmptyState";

type ProjectStatus = "active" | "paused" | "done";

type Project = {
  id: number;
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  status: ProjectStatus;
  agent_count: number;
};

const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => {
  const cls =
    status === "done"
      ? "bg-success/15 text-success border-success/30"
      : status === "active"
      ? "bg-info/15 text-info border-info/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  );
};

export default function ProjectAllocationPage() {
  const queryClient = useQueryClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allocationDrawerOpen, setAllocationDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<Project | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const fetchProjects = () => {
    fetch(`${API_BASE}/api/projects`, { credentials: "include" })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        return res.json();
      })
      .then((data: Project[]) => setProjects(data))
      .catch(err => {
        console.error("Failed to load projects:", err);
      });
  };

  useEffect(() => { fetchProjects(); }, [API_BASE]);

  const invalidateProjectCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["supervisor", "projects"] });
    queryClient.invalidateQueries({ queryKey: ["agent", "projects"] });
  };

  const createProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to create project");
      }
      return (await res.json()) as Project;
    },
    onSuccess: (newProject) => {
      toast.success(`Project "${newProject.name}" created`);
      const projectWithCount = { ...newProject, agent_count: 0 };
      setProjects(prev => [...prev, projectWithCount]);
      setDrawerOpen(false);
      invalidateProjectCaches();
    },
    onError: (err: any, payload) => {
      toast.error(err?.message || "Failed to create project", {
        action: { label: "Retry", onClick: () => createProjectMutation.mutate(payload) },
      });
    },
  });

  const deactivateProjectMutation = useMutation({
    mutationFn: async (project: Project) => {
      const res = await fetch(`${API_BASE}/api/projects/${project.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to deactivate project");
      }
      return project;
    },
    onSuccess: (project) => {
      toast.success(`Project "${project.name}" deactivated`);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setConfirmTarget(null);
      invalidateProjectCaches();
    },
    onError: (err: any, project) => {
      toast.error(err?.message || "Failed to deactivate project", {
        action: { label: "Retry", onClick: () => deactivateProjectMutation.mutate(project) },
      });
    },
  });

  const handleCreateProject = (data: Partial<Project>) => {
    createProjectMutation.mutate(data);
  };

  const handleDeactivateProject = (project: Project) => {
    setConfirmTarget(project);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Project Allocation"
          description="Assign resources and track project timelines."
          actions={
            <Button onClick={() => setDrawerOpen(true)} size="lg" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          }
        />

        <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-elevation-1 overflow-hidden">
          <table className="w-full tabular-nums-tracking">
            <thead className="bg-muted/60 border-b border-border">
              <tr>
                {["Project", "Timeline", "Status", "Team Size"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={FolderKanban}
                      title="No projects yet"
                      description="Create your first project to start allocating agents."
                    />
                  </td>
                </tr>
              ) : (
                projects.map((p) => {
                  const rowPending =
                    deactivateProjectMutation.isPending &&
                    deactivateProjectMutation.variables?.id === p.id;
                  return (
                    <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {p.description || "No description"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span className="text-foreground">{formatDate(p.start_date)}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                            <span className="text-foreground">{formatDate(p.end_date)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ProjectStatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                          p.agent_count > 0
                            ? "bg-brand/10 text-brand border-brand/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}>
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{p.agent_count} Agents</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedProject(p); setAllocationDrawerOpen(true); }}
                          disabled={rowPending}
                          className="text-brand border-brand/30 hover:bg-brand/10 mr-2"
                        >
                          Manage Team
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeactivateProject(p)}
                          disabled={rowPending}
                          className="text-danger hover:text-danger hover:bg-danger/10"
                        >
                          {rowPending ? "..." : "Deactivate"}
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

      <ProjectFormDrawer
        open={drawerOpen}
        onClose={() => {
          if (createProjectMutation.isPending) return;
          setDrawerOpen(false);
        }}
        onSubmit={handleCreateProject}
        submitting={createProjectMutation.isPending}
      />
      <ProjectAgentAllocationDrawer
        open={allocationDrawerOpen}
        onClose={() => {
          setAllocationDrawerOpen(false);
          fetchProjects();
        }}
        project={selectedProject}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => { if (!open) setConfirmTarget(null); }}
        title={confirmTarget ? `Deactivate "${confirmTarget.name}"?` : ""}
        description={
          confirmTarget
            ? "Agents will no longer see this project in their pickers. Existing customer records assigned to this project remain unchanged."
            : undefined
        }
        confirmLabel="Deactivate"
        tone="destructive"
        pending={
          deactivateProjectMutation.isPending &&
          deactivateProjectMutation.variables?.id === confirmTarget?.id
        }
        onConfirm={() => {
          if (confirmTarget) deactivateProjectMutation.mutate(confirmTarget);
        }}
      />
    </AppShell>
  );
}
