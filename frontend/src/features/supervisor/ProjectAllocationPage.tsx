import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import ProjectFormDrawer from "./ProjectFormDrawer";
import ProjectAgentAllocationDrawer from "./ProjectAgentAllocationDrawer";
import { Users } from "lucide-react";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [allocationDrawerOpen, setAllocationDrawerOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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

  const handleCreateProject = (data: Partial<Project>) => {
    fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })
      .then(res => {
        if(!res.ok) throw new Error("Failed to create");
        return res.json();
      })
      .then((newProject: Project) => {
        // Initialize agent_count to 0 for new projects
        const projectWithCount = { ...newProject, agent_count: 0 };
        setProjects(prev => [...prev, projectWithCount]);
        setDrawerOpen(false);
      })
      .catch(err => alert("Error creating project: " + err));
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
                  projects.map((p) => (
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
                      <td className="px-6 py-4 text-right">
                        <button
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          onClick={() => {
                            setSelectedProject(p);
                            setAllocationDrawerOpen(true);
                          }}
                        >
                          Manage Team
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
        <ProjectAgentAllocationDrawer
          open={allocationDrawerOpen}
          onClose={() => {
            setAllocationDrawerOpen(false);
            // Refresh list when drawer closes to update count
            fetchProjects(); 
          }}
          project={selectedProject}
        />
      </div>
    </AppShell>
  );
}