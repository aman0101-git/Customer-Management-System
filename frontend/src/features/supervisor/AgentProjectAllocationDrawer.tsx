import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Briefcase, Plus, Minus, FolderOpen, X, CheckCircle2 } from "lucide-react";

interface Project {
  id: number;
  name: string;
  is_assigned: boolean; // 1 or 0 from backend
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

  const API_BASE = import.meta.env.VITE_API_URL || "http://192.168.1.14:3000";

  const refreshProjects = () => {
    if (agent?.id) {
      fetch(`${API_BASE}/api/users/${agent.id}/projects`, {
        credentials: "include",
      })
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

  const handleAssignment = async (projectId: number, action: 'assign' | 'unassign') => {
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
      <DrawerContent className="max-w-2xl ml-auto h-full rounded-l-2xl border-l border-slate-200 shadow-2xl bg-slate-50 flex flex-col focus:outline-none">
        
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between border-b border-slate-200 px-8 py-6 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-100 text-violet-600 rounded-xl shadow-sm">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold text-slate-900">
                Project Access
              </DrawerTitle>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                Assigning projects to: <span className="text-violet-700 font-bold bg-violet-50 px-2 py-0.5 rounded border border-violet-100">{agent.first_name} {agent.last_name}</span>
              </p>
            </div>
          </div>
          <DrawerClose asChild>
            <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Assigned Section */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Active Assignments ({assignedProjects.length})
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {assignedProjects.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 bg-white/50">
                  <span className="text-sm font-medium">No projects assigned yet.</span>
                </div>
              ) : (
                assignedProjects.map(project => (
                  <div key={project.id} className="group flex items-center justify-between p-4 bg-white border border-emerald-100 shadow-sm rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700">{project.name}</span>
                    </div>
                    <button
                      onClick={() => handleAssignment(project.id, 'unassign')}
                      disabled={loadingId === project.id}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Revoke Access"
                    >
                      {loadingId === project.id ? (
                        <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Minus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="h-px bg-slate-200 w-full" />

          {/* Available Section */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Available Projects ({availableProjects.length})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {availableProjects.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">
                  All your projects are already assigned to this agent.
                </div>
              ) : (
                availableProjects.map(project => (
                  <div key={project.id} className="group flex items-center justify-between p-4 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-violet-200 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{project.name}</span>
                    </div>
                    <button
                      onClick={() => handleAssignment(project.id, 'assign')}
                      disabled={loadingId === project.id}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-violet-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loadingId === project.id ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Assign
                    </button>
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