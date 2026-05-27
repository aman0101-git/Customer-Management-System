// ============================================================================
// PHASE 3 — SupervisorSummaryDashboard
// ----------------------------------------------------------------------------
// All React Query keys, sec1/sec2/sec3 fetch logic, drill-down handler,
// ConversionFunnel + Sparkline derivation, and MatrixTable behaviour
// preserved unchanged.
//
// Visual changes:
//   - PageHeader replaces hand-rolled title row.
//   - Tabs / SelectInput / FilterBar use tokens.
//   - Section-1 ten-card grid uses a single semantic tone map (no more 10x
//     hardcoded text-/bg- color pairs).
//   - MatrixTable surfaces tokenized; brand for active numbers.
// ============================================================================

import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import DrillDownModal from "./DrillDownModal";
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
import { Calendar, Briefcase, Layers, Users, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ConversionFunnel from "@/components/system/ConversionFunnel";
import Sparkline from "@/components/system/Sparkline";
import PageHeader from "@/components/system/PageHeader";
import NativeSelect from "@/components/system/NativeSelect";

const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex p-1 bg-muted/60 rounded-lg w-fit border border-border">
    {labels.map((label: string, idx: number) => (
      <button
        key={idx}
        onClick={() => setActive(idx)}
        className={`relative px-4 py-1.5 text-sm font-semibold rounded-md transition-[background-color,color,box-shadow] duration-200 ease-ams-out ${
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

type CardTone = "brand" | "info" | "success" | "warning" | "danger" | "muted" | "violet" | "rose";
const CARD_TONE_CLASSES: Record<CardTone, { text: string; border: string; dot: string }> = {
  brand:   { text: "text-brand",            border: "border-brand/30",   dot: "bg-brand" },
  info:    { text: "text-info",             border: "border-info/30",    dot: "bg-info" },
  success: { text: "text-success",          border: "border-success/30", dot: "bg-success" },
  warning: { text: "text-warning",          border: "border-warning/30", dot: "bg-warning" },
  danger:  { text: "text-danger",           border: "border-danger/30",  dot: "bg-danger" },
  muted:   { text: "text-muted-foreground", border: "border-border",     dot: "bg-muted-foreground/40" },
  violet:  { text: "text-chart-4",          border: "border-chart-4/30", dot: "bg-chart-4" },
  rose:    { text: "text-chart-5",          border: "border-chart-5/30", dot: "bg-chart-5" },
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
  return {
    startDate: format(start, "yyyy-MM-dd") + " 00:00:00",
    endDate:   format(end,   "yyyy-MM-dd") + " 23:59:59",
  };
};

export default function SupervisorSummaryDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [period, setPeriod] = useState("This Week");
  const [pipelinePeriod, setPipelinePeriod] = useState("This Week");
  const [sec3Period, setSec3Period] = useState("This Week");
  const [mode, setMode] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const agentsQuery = useQuery<any[]>({
    queryKey: ["supervisor", "agents"],
    queryFn: async () => {
      const res = await axios.get("/api/supervisor/summary-dashboard?section=associates");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const agents: any[] = agentsQuery.data ?? [];

  const projectsQuery = useQuery<any[]>({
    queryKey: ["supervisor", "projects"],
    queryFn: async () => {
      const res = await axios.get("/api/supervisor/summary-dashboard?section=projects");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const projects: any[] = projectsQuery.data ?? [];

  const sec1Params = { agentId: selectedAgent, projectId: selectedProject, period };
  const sec1Query = useQuery<Record<string, number>>({
    queryKey: ["supervisor", "summary", 1, sec1Params],
    queryFn: async () => {
      const { startDate, endDate } = getDatesFromPeriod(period);
      const res = await axios.get("/api/supervisor/summary-dashboard", {
        params: { section: "1", agentId: selectedAgent, projectId: selectedProject, startDate, endDate },
      });
      return res.data || {};
    },
    enabled: !!user && activeTab === 0,
    staleTime: 30_000,
  });

  const sec2Params = { agentId: selectedAgent, projectId: selectedProject, pipelinePeriod, mode };
  const sec2Query = useQuery<any[]>({
    queryKey: ["supervisor", "summary", 2, sec2Params],
    queryFn: async () => {
      const { startDate, endDate } = getDatesFromPeriod(pipelinePeriod);
      const res = await axios.get("/api/supervisor/summary-dashboard", {
        params: { section: "2", agentId: selectedAgent, projectId: selectedProject, startDate, endDate, mode },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user && activeTab === 1,
    staleTime: 30_000,
  });

  const sec3Params = { agentId: selectedAgent, projectId: selectedProject, sec3Period };
  const sec3Query = useQuery<any[]>({
    queryKey: ["supervisor", "summary", 3, sec3Params],
    queryFn: async () => {
      const { startDate, endDate } = getDatesFromPeriod(sec3Period);
      const res = await axios.get("/api/supervisor/summary-dashboard", {
        params: { section: "3", agentId: selectedAgent, projectId: selectedProject, startDate, endDate },
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
      let usePeriod = period;
      if (section === "pipeline") usePeriod = pipelinePeriod;
      if (section === "volume")   usePeriod = sec3Period;
      const { startDate, endDate } = getDatesFromPeriod(usePeriod);

      const res = await axios.get("/api/supervisor/drill-down", {
        params: {
          supervisorId: user.id,
          agentId: selectedAgent,
          projectId: selectedProject,
          startDate, endDate, statusCode, section, dayNum,
          mode: section === "pipeline" ? mode : undefined,
        },
      });
      setModalData(res.data);
    } catch (e) {
      console.error("Drill down error", e);
    } finally {
      setModalLoading(false);
    }
  };

  const AgentFilter = () => (
    <NativeSelect icon={Users} value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
      <option value="all">All Agents</option>
      {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </NativeSelect>
  );

  const ProjectFilter = () => (
    <NativeSelect icon={Briefcase} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
      <option value="all">All Projects</option>
      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </NativeSelect>
  );

  const getCount = (data: Record<string, number>, code: string) => data?.[code] ?? 0;

  const SECTION1_CARDS: Array<[string, string, CardTone]> = [
    ["Follow Up", "follow-up", "info"],
    ["Visit Proposed", "visit-proposed", "brand"],
    ["Visit Confirmed", "visit-confirmed", "brand"],
    ["Virtual Meet Done", "virtual-meet-done", "violet"],
    ["Virtual Meet Confirmed", "virtual-meet-confirmed", "violet"],
    ["Visit Done", "visit-done", "warning"],
    ["Booking", "booking-done", "success"],
    ["SDOW", "sdow", "warning"],
    ["Not Reachable", "not-reachable", "rose"],
    ["Ringing", "ringing", "danger"],
  ];

  const renderSection1 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card text-card-foreground p-3 rounded-xl shadow-elevation-1 border border-border flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-2 text-foreground w-full md:w-auto">
          <div className="p-1.5 bg-brand/15 text-brand rounded-md"><Filter className="w-4 h-4" /></div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <AgentFilter />
          <ProjectFilter />
          <NativeSelect icon={Calendar} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option>
          </NativeSelect>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Team conversion funnel
        </div>
        <ConversionFunnel stages={funnelStages} accentClass="bg-brand" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {SECTION1_CARDS.map(([label, code, tone]) => {
          const t = CARD_TONE_CLASSES[tone];
          return (
            <div
              key={code}
              onClick={() => handleDrillDown(code, "cards")}
              className={`bg-card text-card-foreground rounded-xl border ${t.border} p-3 shadow-elevation-1 hover:shadow-elevation-2 transition-shadow cursor-pointer group`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight group-hover:text-foreground transition-colors">{label}</h3>
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="flex items-end gap-1">
                <span className={`text-3xl font-bold tracking-tight tabular-nums ${t.text} group-hover:scale-105 transition-transform origin-left`}>
                  {getCount(sec1Data, code)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const MatrixTable = ({ rows, data, isPipeline }: any) => {
    const days = [
      { l: "Mon", n: 1 }, { l: "Tue", n: 2 }, { l: "Wed", n: 3 },
      { l: "Thu", n: 4 }, { l: "Fri", n: 5 }, { l: "Sat", n: 6 }, { l: "Sun", n: 7 },
    ];
    let grandTotal = 0;
    const colTotals: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

    return (
      <div className="bg-card text-card-foreground rounded-lg shadow-elevation-1 border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse tabular-nums-tracking">
            <thead>
              <tr className="bg-muted/60 text-foreground">
                <th className="p-3 text-left w-48 border border-border font-bold uppercase tracking-wider">Status</th>
                {days.map(d => <th key={d.l} className="p-3 text-center w-16 border border-border font-bold">{d.l}</th>)}
                <th className="p-3 text-center w-20 border border-border bg-muted font-bold text-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => {
                let rTot = 0;
                const rowBg = idx % 2 === 0 ? "bg-card" : "bg-muted/30";

                return (
                  <tr key={r.code} className={`${rowBg} hover:bg-accent/40 transition-colors`}>
                    <td className="p-2 pl-3 font-semibold text-foreground capitalize border border-border">
                      {r.label}
                    </td>
                    {days.map(d => {
                      const rec = data.find((x: any) => x.status_code === r.code && x.day_num === d.n);
                      let c = 0;
                      if (isPipeline && rec) c = mode === "fresh" ? rec.fresh : mode === "repeated" ? rec.repeated : (Number(rec.fresh) + Number(rec.repeated));
                      else if (rec) c = rec.count;
                      rTot += Number(c); colTotals[d.n] += Number(c);

                      return (
                        <td
                          key={d.l}
                          onClick={() => c > 0 && handleDrillDown(r.code, isPipeline ? "pipeline" : "volume", d.n)}
                          className={`p-2 text-center border border-border transition-colors ${c > 0 ? "cursor-pointer hover:bg-accent/60" : ""}`}
                        >
                          {c > 0 ? (
                            <span className="font-bold text-brand">{c}</span>
                          ) : (
                            <span className="text-muted-foreground/40 font-medium">0</span>
                          )}
                        </td>
                      );
                    })}

                    <td
                      onClick={() => rTot > 0 && handleDrillDown(r.code, isPipeline ? "pipeline" : "volume")}
                      className={`p-2 text-center font-bold text-foreground bg-muted/40 border border-border transition-colors ${rTot > 0 ? "cursor-pointer hover:bg-muted/70" : ""}`}
                    >
                      {rTot > 0 ? rTot : <span className="text-muted-foreground/40">0</span>}
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-foreground text-background border-t-2 border-border">
                <td className="p-3 pl-3 font-bold uppercase tracking-wider border border-border">Grand Total</td>
                {days.map(d => {
                  grandTotal += colTotals[d.n];
                  const c = colTotals[d.n];
                  return (
                    <td
                      key={d.l}
                      onClick={() => c > 0 && handleDrillDown("all", isPipeline ? "pipeline" : "volume", d.n)}
                      className={`p-3 text-center font-bold border border-border transition-colors ${c > 0 ? "cursor-pointer hover:bg-background/10" : ""}`}
                    >
                      {c > 0 ? c : <span className="text-background/40">0</span>}
                    </td>
                  );
                })}
                <td
                  onClick={() => grandTotal > 0 && handleDrillDown("all", isPipeline ? "pipeline" : "volume")}
                  className={`p-3 text-center text-sm font-extrabold bg-brand text-brand-foreground border border-brand transition-colors ${grandTotal > 0 ? "cursor-pointer hover:bg-brand/90" : ""}`}
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

  const renderSection2 = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card text-card-foreground p-3 rounded-xl shadow-elevation-1 border border-border flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto"><AgentFilter /><ProjectFilter /></div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <NativeSelect icon={Calendar} value={pipelinePeriod} onChange={(e) => setPipelinePeriod(e.target.value)}>
            <option>Past Week</option><option>This Week</option><option>Next Week</option>
          </NativeSelect>
          <NativeSelect icon={Layers} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="all">All Leads</option><option value="fresh">Fresh</option><option value="repeated">Repeated</option>
          </NativeSelect>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team daily pipeline trend</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Mon-Sun, sum across pipeline statuses</div>
        </div>
        <Sparkline
          data={sec2DailyTotals}
          labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
          ariaLabel="Team daily pipeline trend"
        />
      </div>

      <MatrixTable isPipeline={true} data={sec2Data} rows={[
        { label: "Visit Proposed", code: "visit-proposed" },
        { label: "Visit Confirmed", code: "visit-confirmed" },
        { label: "Virtual Meet Confirmed", code: "virtual-meet-confirmed" },
      ]} />
    </div>
  );

  const renderSection3 = () => {
    const allRows = ["visit-proposed", "visit-confirmed", "virtual-meet-done", "virtual-meet-confirmed",
                     "visit-done", "booking-done", "lost", "follow-up", "sdow", "not-reachable", "ringing"]
                     .map(s => ({ label: s.replace(/-/g, " "), code: s }));
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="bg-card text-card-foreground p-3 rounded-xl shadow-elevation-1 border border-border flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="flex flex-wrap gap-2 w-full md:w-auto"><AgentFilter /><ProjectFilter /></div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <NativeSelect icon={Calendar} value={sec3Period} onChange={(e) => setSec3Period(e.target.value)}>
              <option>Past Week</option><option>This Week</option><option>This Month</option>
            </NativeSelect>
          </div>
        </div>
        <MatrixTable isPipeline={false} data={sec3Data} rows={allRows} />
      </div>
    );
  };

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto">

        <PageHeader
          title="Supervisor Overview"
          description="Real-time team performance metrics."
          actions={<Tabs active={activeTab} setActive={setActiveTab} labels={["Cards View", "Pipeline Grid", "Status Grid"]} />}
        />

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
          <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-56 rounded-lg" />
          </div>
        ) : (
          <>
            {activeTab === 0 && renderSection1()}
            {activeTab === 1 && renderSection2()}
            {activeTab === 2 && renderSection3()}
          </>
        )}

        <DrillDownModal
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
