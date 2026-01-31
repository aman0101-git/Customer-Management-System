import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import ProjectFormDrawer from "./ProjectFormDrawer";

/* -------------------- Types -------------------- */

type ProjectStatus = "active" | "paused" | "done";

type Project = {
  id: number;
  name: string;
  description?: string;
  start_date?: string | null;
  end_date?: string | null;
  status: ProjectStatus;
  agents?: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/projects", { credentials: "include" })
      .then(res => res.json())
      .then((data: Project[]) => setProjects(data));
  }, []);

  const handleCreateProject = (data: Partial<Project>) => {
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })
      .then(res => res.json())
      .then((newProject: Project) => {
        setProjects(prev => [...prev, newProject]);
        setDrawerOpen(false);
      });
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
    <AppShell sidebar={null} user={{}} onLogout={() => {}}>
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
                  <th className="px-6 py-4 text-left text-xs font-bold">Project</th>
                  <th className="px-6 py-4 text-left text-xs font-bold">Timeline</th>
                  <th className="px-6 py-4 text-left text-xs font-bold">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold">Agents</th>
                  <th className="px-6 py-4 text-right text-xs font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-bold">{p.name}</div>
                        <div className="text-xs text-slate-400">
                          {p.description || "No description"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div>S: {formatDate(p.start_date)}</div>
                        <div>E: {formatDate(p.end_date)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <ProjectStatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {p.agents || <span className="italic text-slate-300">Unassigned</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-indigo-600 font-bold text-xs">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ProjectFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSubmit={handleCreateProject}
        />
      </div>
    </AppShell>
  );
}
