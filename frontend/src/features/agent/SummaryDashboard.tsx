// ============================================================================
// PHASE 2 — SummaryDashboard
// ----------------------------------------------------------------------------
// All React Query keys, drill-down logic, sparkline / funnel derivation,
// MatrixTable behaviour are preserved unchanged. Only the chrome was migrated
// to the design system.
//
// Visual changes:
//   - PageHeader replaces the ad-hoc title row.
//   - Tabs / FilterBar / StyledSelect use tokens (bg-muted, border-border, etc.).
//   - The 10 status mini-cards use semantic tone classes via a single map so
//     the page no longer carries 10x hardcoded text-/bg- colour pairs.
//   - MatrixTable uses muted/header tokens; the "active number" cells use brand.
//   - Skeleton block uses tokenized surfaces.
// ============================================================================

import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import AgentDrillDownModal from "./AgentDrillDownModel";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Filter, Briefcase, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ConversionFunnel from "@/components/system/ConversionFunnel";
import Sparkline from "@/components/system/Sparkline";
import PageHeader from "@/components/system/PageHeader";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useDateRangeFilter } from "@/hooks/useDateRangeFilter";

const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex space-x-1 p-1 bg-muted/60 border border-border rounded-xl mb-8 w-fit">
    {labels.map((label: string, idx: number) => (
      <button
        key={idx}
        onClick={() => setActive(idx)}
        className={`px-5 py-2 font-semibold text-sm rounded-lg transition-[background-color,color,box-shadow] duration-200 ease-ams-out ${
          active === idx
            ? "bg-card text-brand shadow-elevation-1 ring-1 ring-ring/20"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const ALL_STATUSES = [
  "visit-proposed", "visit-confirmed", "virtual-meet-done", "virtual-meet-confirmed",
  "visit-done", "booking-done", "lost", "follow-up", "sdow", "not-reachable", "ringing",
];

// Phase 2: single source of truth for the 10 status cards. tone maps onto our
// semantic palette + a handful of chart-* slots for the few statuses that don't
// have a semantic match (purple/cyan).
type CardTone = "brand" | "info" | "success" | "warning" | "danger" | "muted" | "violet" | "rose";
const CARD_TONE_CLASSES: Record<CardTone, { text: string; bg: string; dot: string }> = {
  brand:   { text: "text-brand",                bg: "bg-brand/10",                dot: "bg-brand" },
  info:    { text: "text-info",                 bg: "bg-info/10",                 dot: "bg-info" },
  success: { text: "text-success",              bg: "bg-success/10",              dot: "bg-success" },
  warning: { text: "text-warning",              bg: "bg-warning/10",              dot: "bg-warning" },
  danger:  { text: "text-danger",               bg: "bg-danger/10",               dot: "bg-danger" },
  muted:   { text: "text-muted-foreground",     bg: "bg-muted",                   dot: "bg-muted-foreground/40" },
  violet:  { text: "text-chart-4",              bg: "bg-chart-4/10",              dot: "bg-chart-4" },
  rose:    { text: "text-chart-5",              bg: "bg-chart-5/10",              dot: "bg-chart-5" },
};

const getDatesFromPeriod = (p: string) => {
  const now = new Date();
  let start = now, end = now;
  if (p === "Today") { start = now; end = now; }
  else if (p === "Yesterday") { start = subDays(now, 1); end = subDays(now, 1); }
  else if (p === "This Week") { start = startOfWeek(now, { weekStartsOn: 1 }); end = endOfWeek(now, { weekStartsOn: 1 }); }
  else if (p === "This Month") { start = startOfMonth(now); end = endOfMonth(now); }
  else if (p === "Past Week") { const prev = subWeeks(now, 1); start = startOfWeek(prev, { weekStartsOn: 1 }); end = endOfWeek(prev, { weekStartsOn: 1 }); }
  else if (p === "Next Week") { const next = addWeeks(now, 1); start = startOfWeek(next, { weekStartsOn: 1 }); end = endOfWeek(next, { weekStartsOn: 1 }); }
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") };
};

export default function SummaryDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState("all");
  // Section-1 analytics period — reusable URL-persisted filter w/ custom range.
  const dateFilter = useDateRangeFilter({ defaultFilter: "this-week" });
  const [pipelinePeriod, setPipelinePeriod] = useState("This Week");
  const [mode, setMode] = useState("all");
  const [sec3Period, setSec3Period] = useState("This Week");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const projectsQuery = useQuery<any[]>({
    queryKey: ["agent", "projects"],
    queryFn: async () => {
      const res = await axios.get("/api/agent/customers/summary-dashboard?section=projects");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const projects: any[] = projectsQuery.data ?? [];

  const sec1Params = { projectId: selectedProject, range: dateFilter.range };
  const sec1Query = useQuery<Record<string, number>>({
    queryKey: ["agent", "summary", 1, sec1Params],
    queryFn: async () => {
      const { startDate, endDate } = dateFilter.range;
      const res = await axios.get("/api/agent/customers/summary-dashboard", {
        params: { section: "1", projectId: selectedProject, startDate, endDate },
      });
      return res.data || {};
    },
    enabled: !!user && activeTab === 0,
    staleTime: 30_000,
  });

  const sec2Params = { pipelinePeriod, mode };
  const sec2Query = useQuery<any[]>({
    queryKey: ["agent", "summary", 2, sec2Params],
    queryFn: async () => {
      const { startDate, endDate } = getDatesFromPeriod(pipelinePeriod);
      const res = await axios.get("/api/agent/customers/summary-dashboard", {
        params: { section: "2", startDate, endDate, mode },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user && activeTab === 1,
    staleTime: 30_000,
  });

  const sec3Params = { projectId: selectedProject, sec3Period };
  const sec3Query = useQuery<any[]>({
    queryKey: ["agent", "summary", 3, sec3Params],
    queryFn: async () => {
      const { startDate, endDate } = getDatesFromPeriod(sec3Period);
      const res = await axios.get("/api/agent/customers/summary-dashboard", {
        params: { section: "3", projectId: selectedProject, startDate, endDate },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user && activeTab === 2,
    staleTime: 30_000,
  });

  const sec1Data: Record<string, number> = sec1Query.data ?? {};
  const sec2Data: any[] = sec2Query.data ?? [];
  const sec3Data: any[] = sec3Query.data ?? [];

  const activeQuery =
    activeTab === 0 ? sec1Query : activeTab === 1 ? sec2Query : sec3Query;
  const loading = activeQuery.isLoading;
  const errored = activeQuery.isError;

  const funnelStages = useMemo(() => [
    { label: "Visit Proposed", count: sec1Data["visit-proposed"] ?? 0 },
    { label: "Visit Confirmed", count: sec1Data["visit-confirmed"] ?? 0 },
    { label: "Visit Done", count: sec1Data["visit-done"] ?? 0 },
    { label: "Booking Done", count: sec1Data["booking-done"] ?? 0 },
  ], [sec1Data]);

  const sec2DailyTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const rec of sec2Data) {
      const d = Number(rec.day_num);
      if (!d || d < 1 || d > 7) continue;
      const fresh = Number(rec.fresh) || 0;
      const repeated = Number(rec.repeated) || 0;
      const v = mode === "fresh" ? fresh : mode === "repeated" ? repeated : fresh + repeated;
      totals[d - 1] += v;
    }
    return totals;
  }, [sec2Data, mode]);

  const handleDrillDown = async (statusCode: string, section: string, dayNum?: number) => {
    if (!user) return;
    setModalOpen(true);
    setModalLoading(true);
    const dayLabel = dayNum ? " (Day View)" : " (Total View)";
    setModalTitle(`${statusCode.replace(/-/g, " ")}${dayLabel}`);

    try {
      let startDate: string, endDate: string;
      if (section === "pipeline") {
        ({ startDate, endDate } = getDatesFromPeriod(pipelinePeriod));
      } else if (section === "volume") {
        ({ startDate, endDate } = getDatesFromPeriod(sec3Period));
      } else {
        ({ startDate, endDate } = dateFilter.range);
      }

      const res = await axios.get("/api/agent/customers/drill-down", {
        params: { projectId: selectedProject, startDate, endDate, statusCode, section, dayNum },
      });
      setModalData(res.data);
    } catch (e) {
      console.error("Drill down error", e);
    } finally {
      setModalLoading(false);
    }
  };

  const getCount = (data: Record<string, number>, code: string) => data?.[code] ?? 0;

  const FilterBar = ({ children }: any) => (
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-card border border-border rounded-xl shadow-elevation-1 p-4 items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <Filter className="w-4 h-4" />
        <span className="text-sm uppercase tracking-wide">Filters</span>
      </div>
      <div className="flex flex-wrap gap-3 w-full md:w-auto">{children}</div>
    </div>
  );

  const StyledSelect = ({ value, onChange, options, icon: Icon }: any) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <select
        className="pl-9 pr-8 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:ring-2 focus:ring-ring/40 focus:border-ring transition-[border-color,box-shadow,background-color] cursor-pointer hover:bg-accent/40 w-full md:w-48 appearance-none"
        value={value}
        onChange={onChange}
      >
        {options}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  const MatrixTable = ({ rows, data, totalLabel = "Total", isPipeline = false }: any) => {
    const days = [
      { label: "Mon", sql: 1 }, { label: "Tue", sql: 2 }, { label: "Wed", sql: 3 },
      { label: "Thu", sql: 4 }, { label: "Fri", sql: 5 }, { label: "Sat", sql: 6 }, { label: "Sun", sql: 7 },
    ];
    const colTotals: Record<number, number> = {};
    days.forEach(d => { colTotals[d.sql] = 0; });
    let grandTotal = 0;

    return (
      <div className="bg-card text-card-foreground rounded-xl shadow-elevation-1 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse tabular-nums-tracking">
            <thead className="bg-muted/60 text-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold border border-border w-1/4 min-w-[150px]">Status</th>
                {days.map((d) => (
                  <th key={d.label} className="px-3 py-2 text-center font-semibold border border-border">{d.label}</th>
                ))}
                <th className="px-3 py-2 text-center font-bold text-foreground bg-muted border border-border">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => {
                let rowTotal = 0;
                return (
                  <tr key={row.code} className="hover:bg-accent/30 transition-colors">
                    <td className="px-3 py-2 font-medium text-foreground capitalize border border-border">{row.label}</td>
                    {days.map((d) => {
                      let c = 0;
                      const record = data.find((item: any) => item.status_code === row.code && item.day_num === d.sql);
                      if (isPipeline && record) {
                        const fresh = Number(record.fresh) || 0;
                        const repeated = Number(record.repeated) || 0;
                        c = (mode === "fresh") ? fresh : (mode === "repeated") ? repeated : (fresh + repeated);
                      } else if (record) {
                        c = Number(record.count) || 0;
                      }
                      rowTotal += c;
                      colTotals[d.sql] += c;

                      return (
                        <td
                          key={d.label}
                          onClick={() => c > 0 && handleDrillDown(row.code, isPipeline ? "pipeline" : "volume", d.sql)}
                          className={`px-3 py-2 text-center border border-border transition-colors ${
                            c > 0
                              ? "text-brand font-bold bg-brand/5 cursor-pointer hover:bg-brand/10"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {c}
                        </td>
                      );
                    })}
                    <td
                      onClick={() => rowTotal > 0 && handleDrillDown(row.code, isPipeline ? "pipeline" : "volume")}
                      className={`px-3 py-2 text-center font-bold text-foreground bg-muted/40 border border-border transition-colors ${rowTotal > 0 ? "cursor-pointer hover:bg-muted/70" : ""}`}
                    >
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-muted/60 font-bold">
                <td className="px-3 py-2 text-foreground uppercase text-xs tracking-wider border border-border">{totalLabel}</td>
                {days.map(d => {
                  grandTotal += colTotals[d.sql];
                  const val = colTotals[d.sql];
                  return (
                    <td
                      key={d.label}
                      onClick={() => val > 0 && handleDrillDown("all", isPipeline ? "pipeline" : "volume", d.sql)}
                      className={`px-3 py-2 text-center border border-border transition-colors ${val > 0 ? "text-brand cursor-pointer hover:bg-muted/80" : "text-muted-foreground/60 font-normal"}`}
                    >
                      {val}
                    </td>
                  );
                })}
                <td
                  onClick={() => grandTotal > 0 && handleDrillDown("all", isPipeline ? "pipeline" : "volume")}
                  className={`px-3 py-2 text-center text-lg text-brand bg-brand/10 border border-border transition-colors ${grandTotal > 0 ? "cursor-pointer hover:bg-brand/20" : ""}`}
                >
                  {grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const SECTION1_CARDS: Array<[string, string, CardTone]> = [
    ["Follow Up", "follow-up", "info"],
    ["Visit Proposed", "visit-proposed", "brand"],
    ["Visit Confirmed", "visit-confirmed", "brand"],
    ["Virtual Meet Done", "virtual-meet-done", "violet"],
    ["Virtual Meet Confirmed", "virtual-meet-confirmed", "violet"],
    ["Visit Done", "visit-done", "warning"],
    ["Booking Done", "booking-done", "success"],
    ["SDOW", "sdow", "warning"],
    ["Not Reachable", "not-reachable", "rose"],
    ["Ringing", "ringing", "danger"],
  ];

  const renderSection1 = () => (
    <div className="space-y-4 animate-fade-in">
      <FilterBar>
        <StyledSelect icon={Briefcase} value={selectedProject} onChange={(e: any) => setSelectedProject(e.target.value)} options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>} />
        <DateRangeFilter
          value={dateFilter.filter}
          onFilterChange={dateFilter.setFilter}
          startDate={dateFilter.draftStart}
          endDate={dateFilter.draftEnd}
          onStartDateChange={dateFilter.setDraftStart}
          onEndDateChange={dateFilter.setDraftEnd}
          onApply={dateFilter.applyCustom}
          validation={dateFilter.validation}
          loading={sec1Query.isFetching}
        />
      </FilterBar>

      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Conversion funnel
        </div>
        <ConversionFunnel stages={funnelStages} accentClass="bg-brand" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {SECTION1_CARDS.map(([label, code, tone]) => {
          const t = CARD_TONE_CLASSES[tone];
          return (
            <Card
              key={code}
              onClick={() => handleDrillDown(code, "cards")}
              className="cursor-pointer group min-h-0 px-4 py-3"
            >
              <CardHeader className="p-0 mb-0">
                <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <div className="flex items-end justify-between">
                  <div className={`text-2xl font-bold tabular-nums ${t.text} group-hover:scale-105 transition-transform origin-left`}>
                    {getCount(sec1Data, code)}
                  </div>
                  <div className={`p-1.5 rounded-full ${t.bg} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${t.dot}`}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderSection2 = () => (
    <div className="space-y-6 animate-fade-in">
      <FilterBar>
        <StyledSelect icon={Calendar} value={pipelinePeriod} onChange={(e: any) => setPipelinePeriod(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>Next Week</option></>} />
        <StyledSelect icon={Layers} value={mode} onChange={(e: any) => setMode(e.target.value)} options={<><option value="all">All Leads</option><option value="fresh">Fresh (Same Day)</option><option value="repeated">Repeated (Pushed)</option></>} />
      </FilterBar>

      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily pipeline trend</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Mon-Sun, sum across pipeline statuses</div>
        </div>
        <Sparkline
          data={sec2DailyTotals}
          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          ariaLabel="Daily pipeline trend"
        />
      </div>

      <MatrixTable rows={[
        { label: "Visit Proposed", code: "visit-proposed" },
        { label: "Visit Confirmed", code: "visit-confirmed" },
        { label: "Virtual Meet Confirmed", code: "virtual-meet-confirmed" },
      ]} data={sec2Data} totalLabel="Total Pipeline" isPipeline={true} />
    </div>
  );

  const renderSection3 = () => (
    <div className="space-y-6 animate-fade-in">
      <FilterBar>
        <StyledSelect icon={Briefcase} value={selectedProject} onChange={(e: any) => setSelectedProject(e.target.value)} options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>} />
        <StyledSelect icon={Calendar} value={sec3Period} onChange={(e: any) => setSec3Period(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>This Month</option></>} />
      </FilterBar>
      <MatrixTable rows={ALL_STATUSES.map(s => ({ label: s.replace(/-/g, " "), code: s }))} data={sec3Data} totalLabel="Grand Total" isPipeline={false} />
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Session expired. Please login.
      </div>
    );
  }

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          eyebrow={format(new Date(), "EEEE, MMMM do, yyyy")}
          title="Summary Dashboard"
          description="Overview of your performance and pipeline."
        />

        <Tabs active={activeTab} setActive={setActiveTab} labels={["Visits & Booking", "Weekly Pipeline", "Status Counts"]} />

        {errored && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm flex items-center justify-between">
            <span>Could not load this section. Showing last known data.</span>
            <button
              type="button"
              onClick={() => activeQuery.refetch()}
              className="font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : (
          <>
            {activeTab === 0 && renderSection1()}
            {activeTab === 1 && renderSection2()}
            {activeTab === 2 && renderSection3()}
          </>
        )}

        <AgentDrillDownModal
          isOpen={modalOpen}
          onClose={setModalOpen}
          title={modalTitle}
          data={modalData}
          loading={modalLoading}
        />
      </div>
    </AppShell>
  );
}
