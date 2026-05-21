import { AppShell } from "@/components/ui/app-shell";
import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/apiBase";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertTriangle, Phone, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { getOverdueInfo, getIdleDays } from "@/lib/urgency";
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

// Phase 5 (May 2026):
//   - Added a name/contact search input wrapped in useDeferredValue.
//   - filteredCustomers, uniqueProjects, statusCounts moved behind useMemo.
//   - Virtualized the table body via @tanstack/react-virtual.
//   - Sticky <thead> so column labels stay visible while scrolling.
//   - Skeleton loader + explicit error state with Retry button.
//
// Phase 7 (May 2026):
//   - Per-row urgency left-border tint (amber level 1+, rose level 3+).
//   - Overdue chip below Follow Up date cell for active leads.
//   - Idle Xd chip in Updated cell for leads idle 7+ days.
//
// Phase 10 (May 2026):
//   - Wired the Complete button onClick (previously rendered but non-functional).
//   - Added tel: link + copy-to-clipboard on contact numbers.

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

// Phase 10: Contact cell — tel: link + copy-to-clipboard icon.
function ContactCell({ contact }: { contact: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const val = contact ?? "";
  if (!val || val === "-") return <span className="text-sm font-mono text-slate-400">-</span>;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      toast.success("Contact copied");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-1.5 group/contact">
      <a
        href={`tel:${val}`}
        onClick={(e) => e.stopPropagation()}
        className="text-sm font-mono text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
        title={`Call ${val}`}
      >
        <Phone className="w-3 h-3 opacity-0 group-hover/contact:opacity-60 transition-opacity shrink-0" />
        {val}
      </a>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover/contact:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-100"
        title="Copy number"
        type="button"
      >
        {copied
          ? <Check className="w-3 h-3 text-emerald-500" />
          : <Copy className="w-3 h-3 text-slate-400" />}
      </button>
    </div>
  );
}

const STATUS_FILTERS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed",
  "visit-proposed", "not-reachable", "lost", "visit-done",
  "virtual-meet", "booking-done", "pending"
];

const NON_EDITABLE_STATUSES = ["visit-done", "booking-done", "lost"];
const COMPLETABLE_STATUSES = ["visit-done", "booking-done", "lost"];

const TABLE_VIRTUAL_ROW_ESTIMATE = 76;

export default function AgentCustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter state
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRangeType, setDateRangeType] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  // Sidebar Accordion State
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  // Phase 10: track in-flight complete call per agentCustomerId
  const [completingId, setCompletingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const resCust = await fetch(`${API_BASE}/api/agent/customers`, { credentials: "include" });
      if (!resCust.ok) throw new Error("Failed to load customers");
      setCustomers(await resCust.json());

      const resProj = await fetch(`${API_BASE}/api/projects`, { credentials: "include" });
      if (!resProj.ok) throw new Error("Failed to load projects");
      setProjects(await resProj.json());

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to load customer directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Phase 10: complete handler — calls PATCH /api/agent/customers/:id/complete
  const handleComplete = async (agentCustomerId: number) => {
    setCompletingId(agentCustomerId);
    try {
      const res = await fetch(`${API_BASE}/api/agent/customers/${agentCustomerId}/complete`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.status === 403) {
        toast.error("You are not allowed to complete this customer.");
        return;
      }
      if (!res.ok) throw new Error("Failed to complete");
      toast.success("Customer marked as completed.");
      await loadData();
    } catch {
      toast.error("Could not complete customer. Please try again.");
    } finally {
      setCompletingId(null);
    }
  };

  const uniqueProjects = useMemo(() => {
    const projectMap = new Map<number, string>();
    customers.forEach(c => {
      if (c.project_id && c.project_name) {
        projectMap.set(c.project_id, c.project_name);
      }
    });
    return Array.from(projectMap.entries()).map(([id, name]) => ({ id, name }));
  }, [customers]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of customers) {
      const k = c.status_code;
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const today = new Date();
    return customers.filter(c => {
      if (projectFilter !== "all" && c.project_id !== Number(projectFilter)) return false;
      if (statusFilter && c.status_code !== statusFilter) return false;

      if (needle) {
        const hayName = String(c.name ?? "").toLowerCase();
        const hayContact = String(c.contact ?? "").toLowerCase();
        if (!hayName.includes(needle) && !hayContact.includes(needle)) return false;
      }

      if (dateRangeType === "all") return true;
      const customerDate = c.assigned_at ? parseISO(c.assigned_at) : null;
      if (!customerDate) return false;

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
  }, [customers, projectFilter, statusFilter, dateRangeType, customStart, customEnd, deferredSearch]);

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

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: filteredCustomers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => TABLE_VIRTUAL_ROW_ESTIMATE,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <AppShell sidebar={null}>
      <div className="relative w-full min-h-[80vh] bg-slate-50">

        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 z-40 bg-white border-r border-slate-200 shadow-xl transition-all duration-300 w-16 hover:w-64 group flex flex-col overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 p-2 space-y-4 mt-2">

            {/* BLOCK 1: STATUS */}
            <div className="rounded-xl overflow-hidden transition-all duration-200">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className={`w-full flex items-center p-2 transition-colors rounded-lg ${statusFilter ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors ${statusFilter ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                  <FilterIcon className="w-4 h-4" />
                </div>
                <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Status</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

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
                     const count = statusCounts.get(status) ?? 0;
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
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors ${projectFilter !== 'all' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                  <ProjectIcon className="w-4 h-4" />
                </div>
                <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Projects</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

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

        {/* Main Content */}
        <div className="flex-1 p-6 ml-16">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center">
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

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or contact..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {loading ? "Loading..." : `${filteredCustomers.length} of ${customers.length} customers`}
              </span>
            </div>
          </div>

          {/* ERROR STATE */}
          {errorMessage && !loading && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {errorMessage}
              </span>
              <button type="button" onClick={loadData} className="font-semibold hover:underline">
                Retry
              </button>
            </div>
          )}

          <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 rounded-lg" />
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="overflow-auto"
                style={{ maxHeight: "calc(100vh - 260px)" }}
              >
                <table className="w-full text-left border-collapse leading-normal">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      {["Customer & Owner", "Contact", "Project", "Status", "Final Status", "Follow Up", "Assigned", "Updated", "Actions"].map((head) => (
                        <th key={head} className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-16 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Search className="w-8 h-8 opacity-40" />
                            <p className="font-semibold text-slate-600 text-sm">
                              {customers.length === 0
                                ? "No customers assigned yet"
                                : "No records match your filters"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {customers.length === 0
                                ? "Use the Lookup tab to search and add new leads."
                                : "Try adjusting the status, project, or date filters above."}
                            </p>
                            {customers.length > 0 && (statusFilter || projectFilter !== "all" || dateRangeType !== "all" || searchInput) && (
                              <button
                                onClick={() => {
                                  setStatusFilter(null);
                                  setProjectFilter("all");
                                  setDateRangeType("all");
                                  setSearchInput("");
                                }}
                                className="mt-1 text-xs font-semibold text-indigo-600 hover:underline"
                              >
                                Clear all filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {paddingTop > 0 && (
                          <tr aria-hidden="true">
                            <td colSpan={9} style={{ height: paddingTop, padding: 0, border: 0 }} />
                          </tr>
                        )}
                        {virtualItems.map((vi) => {
                          const c = filteredCustomers[vi.index];
                          const isCompleted = c.final_status === "COMPLETED";
                          const canEdit = !NON_EDITABLE_STATUSES.includes(c.status_code) && !isCompleted;
                          const canComplete = COMPLETABLE_STATUSES.includes(c.status_code) && !isCompleted;
                          const assigned = formatDateTime(c.assigned_at);
                          const updated = formatDateTime(c.updated_at);
                          const isDoneStatus = c.status_code === "visit-done" || c.status_code === "booking-done";
                          const followUpDateDisplay = isDoneStatus ? formatDateTime(c.done_date).d : formatDateTime(c.follow_up_date).d;
                          const followUpTimeDisplay = isDoneStatus ? "Done Date" : safe(c.follow_up_time);

                          const overdueInfo = (!isDoneStatus && !isCompleted)
                            ? getOverdueInfo(c.follow_up_date)
                            : null;
                          const idleDays = getIdleDays(c.updated_at, c.status_code);
                          const isStale = idleDays >= 7;
                          const isCompleting = completingId === c.id;

                          return (
                            <tr
                              key={c.id}
                              ref={virtualizer.measureElement}
                              data-index={vi.index}
                              className={`hover:bg-slate-50 transition-colors group ${
                                overdueInfo && overdueInfo.level >= 3
                                  ? "border-l-4 border-l-rose-400"
                                  : overdueInfo && overdueInfo.level >= 1
                                  ? "border-l-4 border-l-amber-400"
                                  : ""
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="text-sm font-bold text-slate-800">{safe(c.name)}</div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                                  Owner: {user?.first_name} {user?.last_name}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <ContactCell contact={c.contact} />
                              </td>
                              <td className="px-5 py-4 text-sm text-slate-500 font-medium">{safe(c.project_name)}</td>
                              <td className="px-4 py-4"><StatusBadge status={c.status_code} /></td>
                              <td className="px-4 py-4">
                                 <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border
                                   ${c.final_status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {c.final_status || "PENDING"}
                                 </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className={`text-xs font-bold ${isDoneStatus ? 'text-emerald-700' : 'text-slate-700'}`}>
                                  {followUpDateDisplay}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">{followUpTimeDisplay}</div>
                                {overdueInfo && overdueInfo.level > 0 && (
                                  <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold ${overdueInfo.badgeClass}`}>
                                    {overdueInfo.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-xs font-semibold text-slate-600">{assigned.d}</div>
                                <div className="text-[10px] text-slate-400">{assigned.t}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-xs font-semibold text-slate-600">{updated.d}</div>
                                <div className="text-[10px] text-slate-400">{updated.t}</div>
                                {isStale && (
                                  <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold bg-slate-100 text-slate-500 border-slate-300">
                                    Idle {idleDays}d
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  {canEdit && (
                                    <button
                                      onClick={() => navigate(`/agent/customers/resolve?edit=${c.id}`)}
                                      className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-[11px] shadow-sm"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canComplete && (
                                    <button
                                      onClick={() => handleComplete(c.id)}
                                      disabled={isCompleting}
                                      className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {isCompleting ? "..." : "Complete"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paddingBottom > 0 && (
                          <tr aria-hidden="true">
                            <td colSpan={9} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
