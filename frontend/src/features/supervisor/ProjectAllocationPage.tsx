import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import ProjectFormDrawer from "./ProjectFormDrawer";
import ProjectAgentAllocationDrawer from "./ProjectAgentAllocationDrawer";
import ConfirmDialog from "@/components/system/ConfirmDialog";
import { Users } from "lucide-react";

// Phase 3 (May 2026):
//   - handleCreateProject and handleDeactivateProject wrapped in useMutation.
//   - Sonner toasts replace inline alert().
//   - ConfirmDialog replaces window.confirm() for the destructive deactivate.
//   - On success, invalidates ['supervisor','projects'] and ['agent','projects']
//     so cached project picklists refresh in dashboards.
//   - The allocation drawer (ProjectAgentAllocationDrawer) is intentionally
//     untouched — allocation engine is out of scope.
//   - fetchProjects() still uses fetch (no architectural rewrite). It owns
//     this page's local list and is also called from onSuccess paths.

/* -------------------- Types -------------------- */

type ProjectStatus = "active" | "paused" | "done";

type Project = {
  id: number;
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  status: ProjectStatus;
  // FIX: Changed from string to number
  agent_count: number;
};

/* -------------------- UI Helpers -------------------- */

const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => {
  const isCompleted = status === "done";
  const isActive = status === "active";

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        isCompleted
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : isActive
          ? "bg-blue-50 text-blue-700 border-blue-100"
          : "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
};

/* -------------------- Component -------------------- */

export default function ProjectAllocationPage() {
  const queryClient = useQueryClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allocationDrawerOpen, setAllocationDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Phase 3: confirm-dialog state for project deactivation.
  const [confirmTarget, setConfirmTarget] = useState<Project | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Function to refresh projects list
  const fetchProjects = () => {
    fetch(`${API_BASE}/api/projects`, {
      credentials: "include",
    })
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

  useEffect(() => {
    fetchProjects();
  }, [API_BASE]);

  // Invalidate every cached project list (supervisor + agent) so dashboards
  // see the latest projects on next read.
  const invalidateProjectCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["supervisor", "projects"] });
    queryClient.invalidateQueries({ queryKey: ["agent", "projects"] });
  };

  // --- CREATE PROJECT MUTATION ---
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
      // Local optimistic insertion preserved (no remote round-trip) so the
      // table updates instantly. agent_count is 0 for a fresh project.
      const projectWithCount = { ...newProject, agent_count: 0 };
      setProjects(prev => [...prev, projectWithCount]);
      setDrawerOpen(false);
      invalidateProjectCaches();
    },
    onError: (err: any, payload) => {
      toast.error(err?.message || "Failed to create project", {
        action: {
          label: "Retry",
          onClick: () => createProjectMutation.mutate(payload),
        },
      });
    },
  });

  // --- DEACTIVATE PROJECT MUTATION ---
  const deactivateProjectMutation = useMutation({
    mutationFn: async (project: Project) => {
      const res = await fetch(`${API_BASE}/api/projects/${project.id}`, {
        method: "DELETE", // Using DELETE method for a soft-delete action
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
      // Remove the project from the UI immediately without a full refresh.
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setConfirmTarget(null);
      invalidateProjectCaches();
    },
    onError: (err: any, project) => {
      toast.error(err?.message || "Failed to deactivate project", {
        action: {
          label: "Retry",
          onClick: () => deactivateProjectMutation.mutate(project),
        },
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
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Project Allocation
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Assign resources and track project timelines
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg active:scale-95"
            >
              + Create Project
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timeline</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Team Size</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => {
                    const rowPending =
                      deactivateProjectMutation.isPending &&
                      deactivateProjectMutation.variables?.id === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-400 max-w-[200px] truncate">
                            {p.description || "No description"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{formatDate(p.start_date)}</span>
                            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>{formatDate(p.end_date)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <ProjectStatusBadge status={p.status} />
                        </td>
                        {/* FIX: Display Agent Count */}
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${p.agent_count > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            <Users className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{p.agent_count} Agents</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors mr-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => {
                              setSelectedProject(p);
                              setAllocationDrawerOpen(true);
                            }}
                            disabled={rowPending}
                          >
                            Manage Team
                          </button>
                          <button
                            className="text-rose-600 hover:text-rose-800 font-bold text-xs bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={() => handleDeactivateProject(p)}
                            disabled={rowPending}
                          >
                            {rowPending ? "..." : "Deactivate"}
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

        <ProjectFormDrawer
          open={drawerOpen}
          onClose={() => {
            // Don't allow closing while the create is in flight.
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
            // Refresh list when drawer closes to update count
            fetchProjects();
          }}
          project={selectedProject}
        />

        {/* Phase 3: confirm dialog for project deactivation (replaces window.confirm) */}
        <ConfirmDialog
          open={!!confirmTarget}
          onOpenChange={(open) => {
            if (!open) setConfirmTarget(null);
          }}
          title={
            confirmTarget
              ? `Deactivate "${confirmTarget.name}"?`
              : ""
          }
          description={
            confirmTarget
              ? `Agents will no longer see this project in their pickers. Existing customer records assigned to this project remain unchanged.`
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
      </div>
    </AppShell>
  );
}
