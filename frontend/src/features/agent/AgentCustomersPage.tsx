// ============================================================================
// PHASE 2 — AgentCustomersPage
// ----------------------------------------------------------------------------
// All Phase 5/7/10 logic preserved verbatim:
//   - name/contact search with useDeferredValue
//   - useMemo'd filteredCustomers / uniqueProjects / statusCounts
//   - @tanstack/react-virtual virtualization
//   - sticky thead, skeleton, error state with Retry
//   - per-row urgency left-border tint and chips
//   - PATCH /complete handler with toast feedback
//   - ContactCell tel: link + clipboard copy
//
// Visual changes:
//   - StatusBadge now token-driven via a semantic map (success/warning/danger).
//   - Hover-expand sidebar surfaces tokenized (bg-card / bg-accent / brand).
//   - Table header / cells use design-system tokens.
//   - EmptyState helper used for "no records match filters".
//   - Date cells stop hard-coding emerald/text-slate-* and use tokens.
// ============================================================================

import { AppShell } from "@/components/ui/app-shell";
import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/apiBase";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertTriangle, Phone, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/system/EmptyState";
import { getOverdueInfo, getIdleDays } from "@/lib/urgency";
import { formatISTDate, formatISTTime24 } from "@/lib/formatIST";
import { celebrateVisitDone } from "@/components/system/VisitDoneCelebration";
import {
  isSameDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";

const FilterIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const ProjectIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M17 21v-8.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V21" />
    <path d="M19 10a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1" /><path d="M1 21h22" />
  </svg>
);
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// PHASE 2: token-driven status palette.
type Tone = "success" | "warning" | "danger" | "muted";
const STATUS_TONE: Record<string, Tone> = {
  "booking-done": "success",
  "visit-done": "success",
  "visit-proposed": "warning",
  "visit-confirmed": "warning",
  "virtual-meet-confirmed": "warning",
  "virtual-meet": "warning",
  pending: "danger",
  sdow: "danger",
  "follow-up": "danger",
};
const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger:  "bg-danger/15  text-danger  border-danger/30",
  muted:   "bg-muted      text-muted-foreground border-border",
};

const StatusBadge = ({ status }: { status: string }) => {
  const tone = STATUS_TONE[status] ?? "muted";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${TONE_CLASSES[tone]}`}>
      {status.replace("-", " ")}
    </span>
  );
};

function ContactCell({ contact }: { contact: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const val = contact ?? "";
  if (!val || val === "-") return <span className="text-sm font-mono text-muted-foreground">-</span>;

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
        className="text-sm font-mono text-foreground hover:text-brand transition-colors flex items-center gap-1"
        title={`Call ${val}`}
      >
        <Phone className="w-3 h-3 opacity-0 group-hover/contact:opacity-60 transition-opacity shrink-0" />
        {val}
      </a>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover/contact:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent"
        title="Copy number"
        type="button"
      >
        {copied
          ? <Check className="w-3 h-3 text-success" />
          : <Copy className="w-3 h-3 text-muted-foreground" />}
      </button>
    </div>
  );
}

const STATUS_FILTERS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed",
  "visit-proposed", "not-reachable", "lost", "visit-done",
  "virtual-meet", "booking-done", "pending",
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

  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRangeType, setDateRangeType] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

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

  // Closeout: accept the full row so we can fire the Visit Done celebration
  // for `visit-done` / `booking-done` codes — keeps the table-side completion
  // consistent with CustomerResolvePage's celebration trigger.
  const handleComplete = async (row: any) => {
    const agentCustomerId: number = row.id;
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
      celebrateVisitDone(row.status_code, row.name);
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
      if (c.project_id && c.project_name) projectMap.set(c.project_id, c.project_name);
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
            end: endOfWeek(today, { weekStartsOn: 1 }),
          });
        case "this-month":
          return isWithinInterval(customerDate, {
            start: startOfMonth(today),
            end: endOfMonth(today),
          });
        case "custom":
          if (!customStart || !customEnd) return true;
          return isWithinInterval(customerDate, {
            start: new Date(customStart),
            end: new Date(customEnd),
          });
        default: return true;
      }
    });
  }, [customers, projectFilter, statusFilter, dateRangeType, customStart, customEnd, deferredSearch]);

  const safe = (val: any) => val === null || val === undefined || val === "" ? "-" : val;
  // Closeout: render dates/times in IST 24h via the shared helper so the table
  // is stable regardless of the agent's browser locale.
  const formatDateTime = (dateStr: string | null | undefined) => {
    const d = formatISTDate(dateStr);
    const t = formatISTTime24(dateStr);
    return { d: d === "—" ? "-" : d, t: t === "—" ? "" : t };
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
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <AppShell sidebar={null}>
      <div className="relative w-full min-h-[80vh]">

        {/* Sidebar — hover-expand filter panel */}
        <aside className="fixed left-0 top-16 bottom-0 z-40 bg-card text-card-foreground border-r border-border shadow-elevation-2 transition-all duration-300 w-16 hover:w-64 group flex flex-col overflow-hidden">
          <div className="h-full overflow-y-auto p-2 space-y-4 mt-2">

            {/* STATUS block */}
            <div className="rounded-xl overflow-hidden transition-all duration-200">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className={`w-full flex items-center p-2 transition-colors rounded-lg ${statusFilter ? "bg-brand/10" : "hover:bg-accent/60"}`}
              >
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors ${statusFilter ? "bg-brand text-brand-foreground shadow-elevation-1" : "bg-muted text-muted-foreground group-hover:bg-brand/10 group-hover:text-brand"}`}>
                  <FilterIcon className="w-4 h-4" />
                </div>
                <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">Status</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isStatusOpen && (
                <div className="hidden group-hover:block pl-12 pr-2 pt-2 space-y-1 animate-fade-in">
                  <button
                    onClick={() => setStatusFilter(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === null ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent/60"}`}
                  >
                    <span>All Statuses</span>
                    <span className="opacity-70 tabular-nums">{customers.length}</span>
                  </button>
                  {STATUS_FILTERS.filter(s => s !== "lost").map(status => {
                    const count = statusCounts.get(status) ?? 0;
                    const isActive = statusFilter === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? "bg-brand/10 text-brand border border-brand/20" : "text-muted-foreground hover:bg-accent/60"}`}
                      >
                        <span className="capitalize">{status.replace(/-/g, " ")}</span>
                        <span className="bg-background/60 px-1.5 py-0.5 rounded text-[10px] tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PROJECTS block */}
            <div className="rounded-xl overflow-hidden transition-all duration-200">
              <button
                onClick={() => setIsProjectOpen(!isProjectOpen)}
                className={`w-full flex items-center p-2 transition-colors rounded-lg ${projectFilter !== "all" ? "bg-success/10" : "hover:bg-accent/60"}`}
              >
                <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-colors ${projectFilter !== "all" ? "bg-success text-success-foreground shadow-elevation-1" : "bg-muted text-muted-foreground group-hover:bg-success/10 group-hover:text-success"}`}>
                  <ProjectIcon className="w-4 h-4" />
                </div>
                <div className="ml-3 flex-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200 overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">Projects</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isProjectOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isProjectOpen && (
                <div className="hidden group-hover:block pl-12 pr-2 pt-2 space-y-1 animate-fade-in">
                  <button
                    onClick={() => setProjectFilter("all")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${projectFilter === "all" ? "bg-success text-success-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
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
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? "bg-success/10 text-success border border-success/20" : "text-muted-foreground hover:bg-accent/60"}`}
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        <span className="bg-background/60 px-1.5 py-0.5 rounded text-[10px] tabular-nums">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 ml-16">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Customer Directory</h1>
              <div className="flex items-center gap-3 bg-card text-card-foreground p-2 rounded-xl border border-border shadow-elevation-1">
                <div className="flex items-center gap-2 border-r pr-3 border-border">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Project:</span>
                  <select
                    className="text-xs font-bold text-foreground bg-transparent outline-none cursor-pointer"
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
                  className="text-xs font-bold text-muted-foreground bg-transparent outline-none cursor-pointer px-2"
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
                  <div className="flex items-center gap-2 border-l pl-3 border-border">
                    <input type="date" className="text-[11px] font-medium text-foreground bg-background border border-input rounded px-1" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">To</span>
                    <input type="date" className="text-[11px] font-medium text-foreground bg-background border border-input rounded px-1" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or contact..."
                  className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm shadow-elevation-1 focus:ring-2 focus:ring-ring/40 focus:border-ring outline-none text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow]"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {loading ? "Loading..." : `${filteredCustomers.length} of ${customers.length} customers`}
              </span>
            </div>
          </div>

          {errorMessage && !loading && (
            <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {errorMessage}
              </span>
              <button type="button" onClick={loadData} className="font-semibold hover:underline">
                Retry
              </button>
            </div>
          )}

          <div className="w-full bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 overflow-hidden">
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
                <table className="w-full text-left border-collapse leading-normal tabular-nums-tracking">
                  <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm">
                    <tr className="border-b border-border">
                      {["Customer & Owner", "Contact", "Project", "Status", "Final Status", "Follow Up", "Assigned", "Updated", "Actions"].map((head) => (
                        <th key={head} className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          <EmptyState
                            icon={Search}
                            title={customers.length === 0 ? "No customers assigned yet" : "No records match your filters"}
                            description={
                              customers.length === 0
                                ? "Use the Lookup tab to search and add new leads."
                                : "Try adjusting the status, project, or date filters above."
                            }
                            action={
                              customers.length > 0 &&
                              (statusFilter || projectFilter !== "all" || dateRangeType !== "all" || searchInput) ? (
                                <Button
                                  variant="link"
                                  className="text-brand"
                                  onClick={() => {
                                    setStatusFilter(null);
                                    setProjectFilter("all");
                                    setDateRangeType("all");
                                    setSearchInput("");
                                  }}
                                >
                                  Clear all filters
                                </Button>
                              ) : null
                            }
                          />
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

                          const overdueInfo = (!isDoneStatus && !isCompleted) ? getOverdueInfo(c.follow_up_date) : null;
                          const idleDays = getIdleDays(c.updated_at, c.status_code);
                          const isStale = idleDays >= 7;
                          const isCompleting = completingId === c.id;

                          return (
                            <tr
                              key={c.id}
                              ref={virtualizer.measureElement}
                              data-index={vi.index}
                              className={`hover:bg-accent/40 transition-colors group ${
                                overdueInfo && overdueInfo.level >= 3
                                  ? "border-l-4 border-l-danger"
                                  : overdueInfo && overdueInfo.level >= 1
                                  ? "border-l-4 border-l-warning"
                                  : ""
                              }`}
                            >
                              <td className="px-5 py-4">
                                <div className="text-sm font-semibold text-foreground">{safe(c.name)}</div>
                                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                  Owner: {user?.first_name} {user?.last_name}
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <ContactCell contact={c.contact} />
                              </td>
                              <td className="px-5 py-4 text-sm text-muted-foreground font-medium">{safe(c.project_name)}</td>
                              <td className="px-4 py-4"><StatusBadge status={c.status_code} /></td>
                              <td className="px-4 py-4">
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                                  c.final_status === "COMPLETED"
                                    ? "bg-success/15 text-success border-success/30"
                                    : "bg-muted text-muted-foreground border-border"
                                }`}>
                                  {c.final_status || "PENDING"}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className={`text-xs font-bold ${isDoneStatus ? "text-success" : "text-foreground"}`}>
                                  {followUpDateDisplay}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium">{followUpTimeDisplay}</div>
                                {overdueInfo && overdueInfo.level > 0 && (
                                  <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold ${overdueInfo.badgeClass}`}>
                                    {overdueInfo.label}
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-xs font-semibold text-foreground">{assigned.d}</div>
                                <div className="text-[10px] text-muted-foreground">{assigned.t}</div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="text-xs font-semibold text-foreground">{updated.d}</div>
                                <div className="text-[10px] text-muted-foreground">{updated.t}</div>
                                {isStale && (
                                  <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold bg-muted text-muted-foreground border-border">
                                    Idle {idleDays}d
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  {canEdit && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => navigate(`/agent/customers/resolve?edit=${c.id}`)}
                                      className="text-brand border-brand/30 hover:bg-brand/10 hover:text-brand"
                                    >
                                      Edit
                                    </Button>
                                  )}
                                  {canComplete && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleComplete(c)}
                                      disabled={isCompleting}
                                      className="bg-success text-success-foreground hover:bg-success/90"
                                    >
                                      {isCompleting ? "..." : "Complete"}
                                    </Button>
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
