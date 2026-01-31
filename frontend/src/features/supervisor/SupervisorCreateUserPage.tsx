import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import CreateUserForm from "../admin/CreateUserForm";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";

type User = {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  projects?: string;
};

// Stylish Role Badge
const RoleBadge = ({ role }: { role: string }) => {
  const isAgent = role?.toUpperCase() === "AGENT";
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
      isAgent 
        ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
        : "bg-slate-50 text-slate-700 border-slate-200"
    }`}>
      {role || "N/A"}
    </span>
  );
};

export default function SupervisorCreateUserPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then((res) => res.json())
      .then((users: User[]) => {
        setAgents(users.filter(u => u.role?.toUpperCase() === 'AGENT'));
      });
  }, []);

  return (
    <AppShell sidebar={null} user={{}} onLogout={() => {}}>
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Agent Management</h2>
              <p className="text-sm text-slate-500 font-medium">Manage and monitor your agents</p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 active:scale-95"
              onClick={() => setDrawerOpen(true)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              Create New Agent
            </button>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Agent Details</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Username</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Role</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Projects</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          </div>
                          <p className="text-slate-400 font-medium">No agents found in the system.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    agents.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">
                              {u.first_name?.[0]}{u.last_name?.[0]}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">{u.first_name} {u.last_name}</div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">ID: #{u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">{u.username}</td>
                        <td className="px-6 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-500 font-medium italic">
                            {u.projects || "No projects assigned"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-indigo-600 p-2 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="max-w-md ml-auto">
            <DrawerHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-6">
              <DrawerTitle className="text-lg font-bold text-slate-900">Create New Agent</DrawerTitle>
              <DrawerClose asChild>
                <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="relative flex-1 p-6 overflow-y-auto bg-slate-50/30">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <CreateUserForm allowedRoles={['AGENT']} />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </AppShell>
  );
}