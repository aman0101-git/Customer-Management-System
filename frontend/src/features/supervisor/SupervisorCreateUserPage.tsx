import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import CreateUserForm from "../admin/CreateUserForm";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Users, UserPlus, Search, ShieldCheck, Briefcase, MoreVertical, X, Filter, Power, FolderCog } from "lucide-react";
import AgentProjectAllocationDrawer from "./AgentProjectAllocationDrawer"; // Import the new drawer

type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  project_count: number; // Updated type
  is_active: number; // Updated type (1 or 0)
};

// UI Helper: Avatar Generator
const UserAvatar = ({ first, last }: { first: string; last: string }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-sm">
    {first?.[0]}{last?.[0]}
  </div>
);

// UI Helper: Role Badge
const RoleBadge = ({ role }: { role: string }) => {
  const isAgent = role?.toUpperCase() === "AGENT";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
      isAgent 
        ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
        : "bg-slate-50 text-slate-700 border-slate-200"
    }`}>
      {isAgent && <ShieldCheck className="w-3 h-3" />}
      {role || "N/A"}
    </span>
  );
};

export default function SupervisorCreateUserPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for Project Management Drawer
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);

  // State for Dropdown Menu
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const loadAgents = () => {
    fetch(`${API_BASE}/api/users`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((users: User[]) => {
        setAgents(users.filter(u => u.role?.toUpperCase() === 'AGENT'));
      })
      .catch(err => console.error("Failed to load users:", err));
  };

  useEffect(() => { loadAgents(); }, []);

  // Handle Deactivation / Activation
  const handleToggleStatus = async (agent: User) => {
    setActiveMenuId(null); // Close menu
    const action = agent.is_active ? "Deactivate" : "Activate";
    if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} ${agent.first_name}? \n\nThey will ${agent.is_active ? 'lose access' : 'regain access'} to the system.`)) {
      return;
    }

    try {
      await fetch(`${API_BASE}/api/users/${agent.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !agent.is_active }),
      });
      loadAgents(); // Refresh list
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Handle Opening Project Drawer
  const handleManageProjects = (agent: User) => {
    setActiveMenuId(null);
    setSelectedAgent(agent);
    setProjectDrawerOpen(true);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter logic
  const filteredAgents = agents.filter(agent => 
    agent.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                  <Users className="w-6 h-6 text-white" />
                </div>
                Agent Management
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1 ml-1">
                Monitor performance and manage agent access credentials.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 active:scale-95"
              onClick={() => setDrawerOpen(true)}
            >
              <UserPlus className="w-4 h-4" />
              Onboard New Agent
            </button>
          </div>

          {/* Controls & Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="pl-3 pr-2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                placeholder="Search by name or username..." 
                className="w-full h-10 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="border-l border-slate-100 pl-2">
                <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Agents</span>
              <span className="text-2xl font-black text-indigo-600">{agents.length}</span>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
            <div className="overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Agent Profile</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Role</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Assignments</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-24">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Users className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-slate-900 font-bold">No agents found</h3>
                          <p className="text-slate-400 text-sm mt-1">Try adjusting your search or create a new agent.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((u) => (
                      <tr key={u.id} className={`transition-colors group ${!u.is_active ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50/80'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <UserAvatar first={u.first_name} last={u.last_name} />
                            <div>
                              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                {u.first_name} {u.last_name}
                                {!u.is_active && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold border border-red-200">INACTIVE</span>}
                              </div>
                              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span className={`text-xs font-bold ${u.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {u.is_active ? 'Active' : 'Deactivated'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            {u.project_count > 0 ? (
                              <span className="font-bold text-slate-700">{u.project_count} Projects</span>
                            ) : (
                              <span className="text-slate-400 italic text-xs">No assignments</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === u.id ? null : u.id);
                            }}
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu */}
                          {activeMenuId === u.id && (
                            <div className="absolute right-8 top-8 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                              <div className="p-1">
                                <button
                                  onClick={() => handleManageProjects(u)}
                                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors font-medium text-left"
                                >
                                  <FolderCog className="w-4 h-4" /> Manage Projects
                                </button>
                                <button 
                                  onClick={() => handleToggleStatus(u)}
                                  className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg transition-colors font-medium text-left ${u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                >
                                  <Power className="w-4 h-4" /> {u.is_active ? "Deactivate User" : "Activate User"}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Create Agent Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-w-xl ml-auto h-full rounded-l-2xl border-l border-slate-200 shadow-2xl bg-white flex flex-col focus:outline-none">
            <DrawerHeader className="flex items-center justify-between border-b border-slate-100 px-8 py-6 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <DrawerTitle className="text-xl font-bold text-slate-900">Onboard New Agent</DrawerTitle>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">Create credentials for a new team member.</p>
                </div>
              </div>
              <DrawerClose asChild>
                <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-8 py-8 bg-white">
              <div className="bg-white p-1 rounded-2xl">
                <CreateUserForm allowedRoles={['AGENT']} />
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Agent Project Management Drawer */}
        <AgentProjectAllocationDrawer 
          open={projectDrawerOpen} 
          onClose={() => {
            setProjectDrawerOpen(false);
            loadAgents(); // Refresh count on close
          }} 
          agent={selectedAgent} 
        />

      </div>
    </AppShell>
  );
}