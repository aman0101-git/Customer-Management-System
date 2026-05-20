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

// Phase 2 (May 2026): React Query migration (see queries below).
// Phase 6 (May 2026):
//   - ConversionFunnel above the Tab 1 cards: Proposed -> Confirmed -> Done
//     -> Booking with stage-to-stage conversion %.
//   - Sparkline above the Tab 2 pipeline matrix: Mon-Sun daily totals.
//   Both derive from data already fetched; no new endpoints.

/* ---------------- STYLED TABS ---------------- */
const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl mb-8 w-fit shadow-inner">
    {labels.map((label: string, idx: number) => (
      <button
        key={idx}
        onClick={() => setActive(idx)}
        className={`px-6 py-2.5 font-semibold text-sm rounded-lg transition-all duration-300 ease-in-out ${
          active === idx
            ? "bg-white text-blue-700 shadow-sm scale-100 ring-1 ring-black/5"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const ALL_STATUSES = [
  "visit-proposed", "visit-confirmed", "virtual-meet", "virtual-meet-confirmed",
  "visit-done", "booking-done", "lost", "follow-up", "sdow", "not-reachable", "pending",
];

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
  const [period, setPeriod] = useState("This Week");
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

  const sec1Params = { projectId: selectedProject, period };
  const sec1Query = useQuery<Record<string, number>>({
    queryKey: ["agent", "summary", 1, sec1Params],
    queryFn: async () => {
      const { startDate, endDate } = getDatesFromPeriod(period);
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

  // Phase 6: conversion funnel derivation for Tab 1.
  const funnelStages = useMemo(() => [
    { label: "Visit Proposed", count: sec1Data["visit-proposed"] ?? 0 },
    { label: "Visit Confirmed", count: sec1Data["visit-confirmed"] ?? 0 },
    { label: "Visit Done", count: sec1Data["visit-done"] ?? 0 },
    { label: "Booking Done", count: sec1Data["booking-done"] ?? 0 },
  ], [sec1Data]);

  // Phase 6: daily totals for Tab 2 sparkline.
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
      let usePeriod = period;
      if (section === 'pipeline') usePeriod = pipelinePeriod;
      if (section === 'volume') usePeriod = sec3Period;

      const { startDate, endDate } = getDatesFromPeriod(usePeriod);

      const res = await axios.get("/api/agent/customers/drill-down", {
        params: { projectId: selectedProject, startDate, endDate, statusCode, section, dayNum }
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
    <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100 items-center justify-between">
      <div className="flex items-center gap-2 text-slate-500 font-medium">
        <Filter className="w-4 h-4" />
        <span className="text-sm uppercase tracking-wide">Filters</span>
      </div>
      <div className="flex flex-wrap gap-3 w-full md:w-auto">{children}</div>
    </div>
  );

  const StyledSelect = ({ value, onChange, options, icon: Icon }: any) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {Icon && <Icon className="w-4 h-4" />}
      </div>
      <select
        className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer hover:bg-slate-100 w-full md:w-48 appearance-none"
        value={value}
        onChange={onChange}
      >
        {options}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2 text-left font-semibold border border-slate-300 w-1/4 min-w-[150px]">Status</th>
                {days.map((d) => (
                  <th key={d.label} className="p-2 text-center font-semibold border border-slate-300">{d.label}</th>
                ))}
                <th className="p-2 text-center font-bold text-slate-900 bg-slate-200 border border-slate-300">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => {
                let rowTotal = 0;
                return (
                  <tr key={row.code} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-2 font-medium text-slate-700 capitalize border border-slate-300">{row.label}</td>
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
                          onClick={() => c > 0 && handleDrillDown(row.code, isPipeline ? 'pipeline' : 'volume', d.sql)}
                          className={`p-2 text-center border border-slate-300 transition-all ${c > 0 ? "text-blue-600 font-bold bg-blue-50/50 cursor-pointer hover:bg-blue-100" : "text-slate-300"}`}
                        >
                          {c}
                        </td>
                      );
                    })}
                    <td
                        onClick={() => rowTotal > 0 && handleDrillDown(row.code, isPipeline ? 'pipeline' : 'volume')}
                        className={`p-2 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 transition-all ${rowTotal > 0 ? "cursor-pointer hover:bg-slate-200" : ""}`}
                    >
                        {rowTotal}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-100 font-bold">
                <td className="p-2 text-slate-800 uppercase text-xs tracking-wider border border-slate-300">{totalLabel}</td>
                {days.map(d => {
                    grandTotal += colTotals[d.sql];
                    const val = colTotals[d.sql];
                    return (
                        <td
                          key={d.label}
                          onClick={() => val > 0 && handleDrillDown('all', isPipeline ? 'pipeline' : 'volume', d.sql)}
                          className={`p-2 text-center border border-slate-300 transition-all ${val > 0 ? "text-blue-800 cursor-pointer hover:bg-slate-200" : "text-slate-300 font-normal"}`}
                        >
                            {val}
                        </td>
                    )
                })}
                <td
                    onClick={() => grandTotal > 0 && handleDrillDown('all', isPipeline ? 'pipeline' : 'volume')}
                    className={`p-2 text-center text-lg text-blue-900 bg-blue-100 border border-slate-300 transition-all ${grandTotal > 0 ? "cursor-pointer hover:bg-blue-200" : ""}`}
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

  const renderSection1 = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <FilterBar>
        <StyledSelect icon={Briefcase} value={selectedProject} onChange={(e: any) => setSelectedProject(e.target.value)} options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>} />
        <StyledSelect icon={Calendar} value={period} onChange={(e: any) => setPeriod(e.target.value)} options={<><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option></>} />
      </FilterBar>

      {/* Phase 6: conversion funnel above the cards */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Conversion funnel
        </div>
        <ConversionFunnel stages={funnelStages} accentClass="bg-indigo-500 dark:bg-indigo-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          ["Follow Up", "follow-up", "text-cyan-600", "bg-cyan-50"],
          ["Visit Proposed", "visit-proposed", "text-blue-600", "bg-blue-50"],
          ["Visit Confirmed", "visit-confirmed", "text-indigo-600", "bg-indigo-50"],
          ["Virtual Meet", "virtual-meet", "text-purple-600", "bg-purple-50"],
          ["Virtual Done", "virtual-meet-confirmed", "text-fuchsia-600", "bg-fuchsia-50"],
          ["Visit Done", "visit-done", "text-orange-600", "bg-orange-50"],
          ["Booking Done", "booking-done", "text-emerald-600", "bg-emerald-50"],
          ["SDOW", "sdow", "text-amber-600", "bg-amber-50"],
          ["Not Reachable", "not-reachable", "text-rose-600", "bg-rose-50"],
          ["Lost", "lost", "text-slate-600", "bg-slate-50"],
        ].map(([label, code, colorClass, bgClass]) => (
          <Card
            key={code}
            onClick={() => handleDrillDown(code as string, 'cards')}
            className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
          >
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">{label}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="flex items-end justify-between">
                <div className={`text-2xl font-bold ${colorClass} group-hover:scale-105 transition-transform origin-left`}>
                  {getCount(sec1Data, code as string)}
                </div>
                <div className={`p-1.5 rounded-full ${bgClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                   <div className={`w-1.5 h-1.5 rounded-full ${colorClass.replace('text', 'bg')}`}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSection2 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FilterBar>
        <StyledSelect icon={Calendar} value={pipelinePeriod} onChange={(e: any) => setPipelinePeriod(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>Next Week</option></>} />
        <StyledSelect icon={Layers} value={mode} onChange={(e: any) => setMode(e.target.value)} options={<><option value="all">All Leads</option><option value="fresh">Fresh (Same Day)</option><option value="repeated">Repeated (Pushed)</option></>} />
      </FilterBar>

      {/* Phase 6: week-at-a-glance sparkline above the matrix. */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily pipeline trend</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mon-Sun, sum across pipeline statuses</div>
        </div>
        <Sparkline
          data={sec2DailyTotals}
          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          ariaLabel="Daily pipeline trend"
        />
      </div>

      <MatrixTable rows={[{ label: "Visit Proposed", code: "visit-proposed" }, { label: "Visit Confirmed", code: "visit-confirmed" }, { label: "Virtual Meet Confirmed", code: "virtual-meet-confirmed" }]} data={sec2Data} totalLabel="Total Pipeline" isPipeline={true} />
    </div>
  );

  const renderSection3 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FilterBar>
        <StyledSelect icon={Briefcase} value={selectedProject} onChange={(e: any) => setSelectedProject(e.target.value)} options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>} />
        <StyledSelect icon={Calendar} value={sec3Period} onChange={(e: any) => setSec3Period(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>This Month</option></>} />
      </FilterBar>
      <MatrixTable rows={ALL_STATUSES.map(s => ({ label: s.replace(/-/g, " "), code: s }))} data={sec3Data} totalLabel="Grand Total" isPipeline={false} />
    </div>
  );

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!user) return <div className="p-8 text-center text-slate-500">Session expired. Please login.</div>;

  return (
    <AppShell sidebar={null}>
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Summary Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Overview of your performance and pipeline</p>
        </div>
        <div className="text-sm font-medium text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
           {format(new Date(), "EEEE, MMMM do, yyyy")}
        </div>
      </div>

      <Tabs active={activeTab} setActive={setActiveTab} labels={["Visits & Booking", "Weekly Pipeline", "Status Counts"]} />

      {errored && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between">
          <span>Could not load this section. Showing last known data.</span>
          <button
            type="button"
            onClick={() => activeQuery.refetch()}
            className="text-red-700 font-semibold hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
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
