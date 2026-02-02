import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";

interface Agent {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  assigned: boolean;
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);

  // FIX: Added API_BASE to ensure full URL is used
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const refreshAgents = () => {
    if (project?.id) {
      // FIX: Changed URL from /api/supervisor/projects to /api/projects
      fetch(`${API_BASE}/api/projects/${project.id}/agents`, {
        credentials: "include",
      })
        .then(res => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then(setAgents)
        .catch(() => setAgents([]));
    }
  };

  useEffect(() => {
    if (open) {
      refreshAgents();
    }
  }, [open, project?.id]);

  const handleAssign = async (agentId: number) => {
    setAssigning(agentId);
    // FIX: Changed URL to /api/projects and used backticks
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
    // FIX: Changed URL to /api/projects and used backticks
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
      <DrawerContent className="max-w-3xl ml-auto">
        <DrawerHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6">
          <DrawerTitle className="text-xl font-bold text-slate-900">Project: {project.name}</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="p-6">
          <div className="font-bold mb-2">Assigned Agents</div>
          <div className="flex flex-wrap gap-3 mb-6">
            {assignedAgents.length === 0 ? (
              <span className="text-slate-400">No agents assigned.</span>
            ) : (
              assignedAgents.map(agent => (
                <div key={agent.id} className="flex items-center border rounded px-4 py-2 bg-slate-50">
                  <span className="mr-3 font-semibold">{agent.first_name} {agent.last_name}</span>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded font-bold"
                    disabled={assigning === agent.id}
                    onClick={() => handleUnassign(agent.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="font-bold mb-2">Available Agents</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unassignedAgents.length === 0 && (
                 <span className="text-slate-400 col-span-2">No agents available.</span>
            )}
            {unassignedAgents.map(agent => (
              <div key={agent.id} className="flex items-center border rounded px-4 py-2 bg-white">
                <span className="mr-3 font-semibold">{agent.first_name} {agent.last_name}</span>
                <button
                  className="bg-teal-600 text-white px-3 py-1 rounded font-bold ml-auto"
                  disabled={assigning === agent.id}
                  onClick={() => handleAssign(agent.id)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}