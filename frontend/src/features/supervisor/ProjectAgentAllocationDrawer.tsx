import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Users, UserPlus, UserMinus, User, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // 1. Added useAuth import

interface Agent {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  assigned: boolean;
  supervisor_id: number; // 2. Added supervisor_id to the type
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
  const { user } = useAuth(); // 3. Get the logged-in user
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://192.168.1.14:3000";

  const refreshAgents = () => {
    // Only fetch if we have both a project and a logged-in user
    if (project?.id && user?.id) {
      fetch(`${API_BASE}/api/projects/${project.id}/agents`, {
        credentials: "include",
      })
        .then(res => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((allAgents: Agent[]) => {
          // 4. APPLY THE DOUBLE-LOCK SECURITY FILTER
          const currentUserId = Number(user.id);
          const currentUserRole = user.role?.toUpperCase();

          const myAgents = allAgents.filter(a => {
            // If logged in as SUPERVISOR, the agent's supervisor_id MUST match exactly
            if (currentUserRole === 'SUPERVISOR') {
              return Number(a.supervisor_id) === currentUserId;
            }
            // If Admin, they see everyone
            return true;
          });

          setAgents(myAgents);
        })
        .catch(() => setAgents([]));
    }
  };

  useEffect(() => {
    if (open) {
      refreshAgents();
    }
  }, [open, project?.id, user?.id]); // Added user?.id as a dependency

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
      <DrawerContent className="max-w-4xl ml-auto h-full rounded-l-2xl border-l border-slate-200 shadow-2xl bg-slate-50 flex flex-col focus:outline-none">
        
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between border-b border-slate-200 px-8 py-6 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold text-slate-900">
                Team Allocation
              </DrawerTitle>
              <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                Managing agents for: <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{project.name}</span>
              </p>
            </div>
          </div>
          <DrawerClose asChild>
            <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Section 1: Assigned Agents */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Assigned Team ({assignedAgents.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedAgents.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <div className="p-3 bg-slate-100 rounded-full mb-3 text-slate-400">
                    <UserMinus className="w-6 h-6" />
                  </div>
                  <span className="text-slate-500 font-medium">No agents currently assigned.</span>
                </div>
              ) : (
                assignedAgents.map(agent => (
                  <div key={agent.id} className="group flex items-center justify-between p-4 bg-white border border-emerald-100 shadow-sm rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{agent.first_name} {agent.last_name}</div>
                        <div className="text-xs text-slate-500 truncate">{agent.username}</div>
                      </div>
                    </div>
                    <button
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove from project"
                      disabled={assigning === agent.id}
                      onClick={() => handleUnassign(agent.id)}
                    >
                      {assigning === agent.id ? (
                        <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserMinus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="h-px bg-slate-200 w-full" />

          {/* Section 2: Available Agents */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Available Pool ({unassignedAgents.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedAgents.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-sm italic">
                  All available agents have been assigned.
                </div>
              ) : (
                unassignedAgents.map(agent => (
                  <div key={agent.id} className="group flex items-center justify-between p-4 bg-white border border-slate-200 shadow-sm rounded-xl hover:border-indigo-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {agent.first_name[0]}{agent.last_name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-700 truncate group-hover:text-indigo-900 transition-colors">
                          {agent.first_name} {agent.last_name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{agent.username}</div>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:scale-100"
                      disabled={assigning === agent.id}
                      onClick={() => handleAssign(agent.id)}
                    >
                      {assigning === agent.id ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Add</span>
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