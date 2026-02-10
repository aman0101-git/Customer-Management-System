import { AppShell } from "@/components/ui/app-shell";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/apiBase";
import { 
  isSameDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO 
} from "date-fns";

// --- Icons for Sidebar ---
const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const ProjectIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V21"/><path d="M19 10a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1"/><path d="M1 21h22"/></svg>
);
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    "booking-done": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "visit-done": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "visit-proposed": "bg-amber-100 text-amber-700 border-amber-200",
    "visit-confirmed": "bg-amber-100 text-amber-700 border-amber-200",
    "virtual-meet-confirmed": "bg-amber-100 text-amber-700 border-amber-200",
    "virtual-meet": "bg-amber-100 text-amber-700 border-amber-200",
    "pending": "bg-rose-100 text-rose-700 border-rose-200",
    "sdow": "bg-rose-100 text-rose-700 border-rose-200",
    "follow-up": "bg-rose-100 text-rose-700 border-rose-200",
  };
  const currentStyle = styles[status] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStyle}`}>
      {status.replace("-", " ")}
    </span>
  );
};

export default function AgentCustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Projects Filter State
  const [projects, setProjects] = useState<any[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Sidebar Accordion State
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const STATUS_FILTERS = [
    "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed",
    "visit-proposed", "not-reachable", "lost", "visit-done",
    "virtual-meet", "booking-done", "pending"
  ];

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRangeType, setDateRangeType] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const NON_EDITABLE_STATUSES = ["visit-done", "booking-done", "lost"];
  const COMPLETABLE_STATUSES = ["visit-done", "booking-done", "lost"];

  const loadData = async () => {
    try {
      setLoading(true);
      
      const resCust = await fetch(`${API_BASE}/api/agent/customers`, { credentials: "include" });
      if (resCust.ok) setCustomers(await resCust.json());

      const resProj = await fetch(`${API_BASE}/api/projects`, { credentials: "include" });
      if (resProj.ok) setProjects(await resProj.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- NEW LOGIC: Derive Unique Projects from Customers for Sidebar ---
  const uniqueProjects = useMemo(() => {
    const projectMap = new Map();
    customers.forEach(c => {
      if (c.project_id && c.project_name) {
        projectMap.set(c.project_id, c.project_name);
      }
    });
    return Array.from(projectMap.entries()).map(([id, name]) => ({ id, name }));
  }, [customers]);

  // Filtering Logic
  const filteredCustomers = customers.filter(c => {
    if (projectFilter !== "all" && c.project_id !== Number(projectFilter)) return false;
    if (statusFilter && c.status_code !== statusFilter) return false;

    if (dateRangeType === "all") return true;
    const customerDate = c.assigned_at ? parseISO(c.assigned_at) : null;
    if (!customerDate) return false;

    const today = new Date();
    switch (dateRangeType) {
      case "today": return isSameDay(customerDate, today);
      case "yesterday": return isSameDay(customerDate, subDays(today, 1));
      case "this-week":
        return isWithinInterval(customerDate, {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 })
        });
      case "this-month":
        return isWithinInterval(customerDate, {
          start: startOfMonth(today),
          end: endOfMonth(today)
        });
      case "custom":
        if (!customStart || !customEnd) return true;
        return isWithinInterval(customerDate, {
          start: new Date(customStart),
          end: new Date(customEnd)
        });
      default: return true;
    }
  });

  const safe = (val: any) => val === null || val === undefined || val === "" ? "-" : val;

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return { d: "-", t: "" };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { d: "-", t: "" };
    return {
      d: d.toLocaleDateString('en-GB'),
      t: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (loading) return (
    <AppShell sidebar={null}>
      <div className="w-full p-6 text-center text-slate-500 italic">Syncing with server...</div>
    </AppShell>
  );

  return (
    <AppShell sidebar={null}>
      <div className="relative w-full min-h-[80vh] bg-slate-50">
        
        {/* --- MODIFIED SIDEBAR --- */}
        <aside className="fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-slate-200 shadow-xl transition-all duration-300 w-16 hover:w-64 group flex flex-col overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-2 space-y-4 mt-2">

            {/* BLOCK 1: STATUS */}
            <div className="rounded-xl overflow-hidden transition-all duration-200">
              <button 
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className={`w-full flex items-center p-2 transition-colors rounded-lg ${statusFilter ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                {/* Icon (Always Visible) */}
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors ${statusFilter ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                  <FilterIcon className="w-4 h-4" />
                </div>
                
                {/* Text (Visible on Hover) */}
                <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Status</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown List */}
              {isStatusOpen && (
                <div className="hidden group-hover:block pl-12 pr-2 pt-2 space-y-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  <button
                    onClick={() => setStatusFilter(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === null ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>All Statuses</span>
                    <span className="opacity-70">{customers.length}</span>
                  </button>
                  {STATUS_FILTERS.filter(s => s !== 'lost').map(status => {
                     const count = customers.filter(c => c.status_code === status).length;
                     const isActive = statusFilter === status;
                     return (
                       <button
                         key={status}
                         onClick={() => setStatusFilter(status)}
                         className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
                       >
                         <span className="capitalize">{status.replace(/-/g, ' ')}</span>
                         <span className="bg-white/50 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
                       </button>
                     );
                  })}
                </div>
              )}
            </div>

            {/* BLOCK 2: PROJECTS */}
            <div className="rounded-xl overflow-hidden transition-all duration-200">
              <button 
                onClick={() => setIsProjectOpen(!isProjectOpen)}
                className={`w-full flex items-center p-2 transition-colors rounded-lg ${projectFilter !== 'all' ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                {/* Icon (Always Visible) */}
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors ${projectFilter !== 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                  <ProjectIcon className="w-4 h-4" />
                </div>

                {/* Text (Visible on Hover) */}
                <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Projects</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown List */}
              {isProjectOpen && (
                <div className="hidden group-hover:block pl-12 pr-2 pt-2 space-y-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  <button
                    onClick={() => setProjectFilter("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${projectFilter === "all" ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>All Projects</span>
                  </button>
                  {uniqueProjects.map(p => {
                    const isActive = projectFilter === String(p.id);
                    const count = customers.filter(c => c.project_id === p.id).length;
                    return (
                       <button
                         key={p.id}
                         onClick={() => setProjectFilter(String(p.id))}
                         className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'text-slate-600 hover:bg-slate-100'}`}
                       >
                         <span className="truncate pr-2">{p.name}</span>
                         <span className="bg-white/50 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
                       </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* --- Main Content (Pushed by margin) --- */}
        <div className="flex-1 p-6 ml-16">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-slate-800">Customer Directory</h1>
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              
              <div className="flex items-center gap-2 border-r pr-3 border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Project:</span>
                <select 
                  className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <select 
                className="text-xs font-bold text-slate-600 bg-transparent outline-none cursor-pointer px-2"
                value={dateRangeType}
                onChange={(e) => setDateRangeType(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week (Mon-Sun)</option>
                <option value="this-month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              {dateRangeType === "custom" && (
                <div className="flex items-center gap-2 border-l pl-3 border-slate-100">
                  <input type="date" className="text-[11px] font-medium text-slate-600 border rounded px-1" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">To</span>
                  <input type="date" className="text-[11px] font-medium text-slate-600 border rounded px-1" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse leading-normal">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {/* UPDATED: Added "Final Status" to headers */}
                    {["Customer & Owner", "Contact", "Project", "Status", "Final Status", "Follow Up", "Assigned", "Updated", "Actions"].map((head) => (
                      <th key={head} className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => {
                      const isCompleted = c.final_status === "COMPLETED";
                      const canEdit = !NON_EDITABLE_STATUSES.includes(c.status_code) && !isCompleted;
                      const canComplete = COMPLETABLE_STATUSES.includes(c.status_code) && !isCompleted;
                      const assigned = formatDateTime(c.assigned_at);
                      const updated = formatDateTime(c.updated_at);
                      
                      // LOGIC: Check if this is a 'Done' status
                      const isDoneStatus = c.status_code === "visit-done" || c.status_code === "booking-done";
                      const followUpDateDisplay = isDoneStatus ? formatDateTime(c.done_date).d : formatDateTime(c.follow_up_date).d;
                      const followUpTimeDisplay = isDoneStatus ? "Done Date" : safe(c.follow_up_time);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="text-sm font-bold text-slate-800">{safe(c.name)}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                              Owner: {user?.first_name} {user?.last_name}
                            </div>
                          </td>
                          <td className="px-5 py-4"><div className="text-sm font-mono text-slate-600">{safe(c.contact)}</div></td>
                          <td className="px-5 py-4 text-sm text-slate-500 font-medium">{safe(c.project_name)}</td>
                          <td className="px-4 py-4"><StatusBadge status={c.status_code} /></td>
                          
                          {/* NEW COLUMN: Final Status */}
                          <td className="px-4 py-4">
                             <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border 
                               ${c.final_status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {c.final_status || "PENDING"}
                             </span>
                          </td>

                          {/* UPDATED COLUMN: Follow Up / Done Date */}
                          <td className="px-5 py-4">
                            <div className={`text-xs font-bold ${isDoneStatus ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {followUpDateDisplay}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">{followUpTimeDisplay}</div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-slate-600">{assigned.d}</div>
                            <div className="text-[10px] text-slate-400">{assigned.t}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-slate-600">{updated.d}</div>
                            <div className="text-[10px] text-slate-400">{updated.t}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <button onClick={() => navigate(`/agent/customers/resolve?edit=${c.id}`)} className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-[11px] shadow-sm">Edit</button>
                              )}
                              {canComplete && (
                                <button
                                  className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm"
                                >Complete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400 font-medium">
                        No records found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}