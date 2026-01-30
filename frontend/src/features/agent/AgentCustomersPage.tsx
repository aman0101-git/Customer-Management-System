import { AppShell } from "@/components/ui/app-shell";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

// Professional Badge Component
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
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/agent/customers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      // Apply global filter: Remove "lost" customers immediately from the local state
      const activeCustomers = Array.isArray(data) ? data.filter(c => c.status_code !== 'lost') : [];
      setCustomers(activeCustomers);
    } catch (err) {
      setError("Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  // Filtering Logic
  const filteredCustomers = customers.filter(c => {
    // 1. Status Filter
    if (statusFilter && c.status_code !== statusFilter) return false;

    // 2. Date Filter
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
    <AppShell sidebar={null} user={{}} onLogout={() => {}}>
      <div className="w-full p-6 text-center text-slate-500 italic">Syncing with server...</div>
    </AppShell>
  );

  return (
    <AppShell sidebar={null} user={{}} onLogout={() => {}}>
      <div className="flex w-full min-h-[80vh]">
        {/* Sidebar for Status Filters */}
        <aside className="relative group flex flex-col items-center bg-white border-r border-slate-200 shadow-md transition-all duration-300 w-16 hover:w-56 z-10">
          <div className="flex flex-col gap-2 py-8 w-full">
            <button
              type="button"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 capitalize
                ${statusFilter === null ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'}`}
              onClick={() => setStatusFilter(null)}
            >
              <span className="inline-block w-6 text-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              </span>
              <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity">All Records</span>
              <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] ${statusFilter === null ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'} opacity-0 group-hover:opacity-100 transition-opacity`}>{customers.length}</span>
            </button>

            {STATUS_FILTERS.filter(s => s !== 'lost').map(status => {
              const count = customers.filter(c => c.status_code === status).length;
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 capitalize
                    ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'}`}
                  onClick={() => setStatusFilter(status)}
                >
                  <span className="inline-block w-6 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-300'} border ${isActive ? 'border-white' : 'border-slate-400'}`}></span>
                  </span>
                  <span className="truncate opacity-0 group-hover:opacity-100 transition-opacity">{status.replace(/-/g, ' ')}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] ${isActive ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-slate-800">Customer Directory</h1>
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
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
                    {["Customer & Owner", "Contact", "Project", "Status", "Follow Up", "Assigned", "Updated", "Actions"].map((head) => (
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
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="text-sm font-bold text-slate-800">{safe(c.name)}</div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Owner: {safe(c.owner)}</div>
                          </td>
                          <td className="px-5 py-4"><div className="text-sm font-mono text-slate-600">{safe(c.contact)}</div></td>
                          <td className="px-5 py-4 text-sm text-slate-500 font-medium">{safe(c.project)}</td>
                          <td className="px-5 py-4"><StatusBadge status={c.status_code} /></td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-bold text-slate-700">{formatDateTime(c.follow_up_date).d}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{safe(c.follow_up_time)}</div>
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
                                  onClick={async () => {
                                    if (!window.confirm("Mark as completed?")) return;
                                    const res = await fetch(`${API_BASE}/api/agent/customers/${c.id}/complete`, { method: "PATCH", credentials: "include" });
                                    if (res.ok) loadCustomers();
                                  }}
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
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
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