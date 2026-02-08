import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { AppShell } from "@/components/ui/app-shell";
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

// All possible statuses for Section 3 Rows
const ALL_STATUSES = [
  "visit-proposed",
  "visit-confirmed",
  "virtual-meet",
  "virtual-meet-confirmed",
  "visit-done",
  "booking-done",
  "lost",
  "follow-up",
  "sdow",
  "not-reachable",
  "pending",
];

export default function SummaryDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState("all");
  const [period, setPeriod] = useState("This Week"); // Sec 1 Only
  
  // Section 2 Specific
  const [pipelinePeriod, setPipelinePeriod] = useState("This Week"); 
  const [mode, setMode] = useState("all"); 

  // Section 3 Specific
  const [sec3Period, setSec3Period] = useState("This Week");

  // Data Containers
  const [sec1Data, setSec1Data] = useState<Record<string, number>>({});
  const [sec2Data, setSec2Data] = useState<any[]>([]);
  const [sec3Data, setSec3Data] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  // --- DATE LOGIC ---
  const getDatesFromPeriod = (p: string) => {
    const now = new Date();
    let start = now;
    let end = now;

    if (p === "Today") {
      start = now;
      end = now;
    } else if (p === "Yesterday") {
      start = subDays(now, 1);
      end = subDays(now, 1);
    } else if (p === "This Week") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (p === "This Month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (p === "Past Week") {
      const prev = subWeeks(now, 1);
      start = startOfWeek(prev, { weekStartsOn: 1 });
      end = endOfWeek(prev, { weekStartsOn: 1 });
    } else if (p === "Next Week") {
      const next = addWeeks(now, 1);
      start = startOfWeek(next, { weekStartsOn: 1 });
      end = endOfWeek(next, { weekStartsOn: 1 });
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(
        `/api/agent/customers/summary-dashboard?section=projects&_ts=${Date.now()}`
      );
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch {
      setProjects([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      
      // SECTION 1
      if (activeTab === 0) {
        const { startDate, endDate } = getDatesFromPeriod(period);
        const res = await axios.get("/api/agent/customers/summary-dashboard", {
          params: { section: "1", projectId: selectedProject, startDate, endDate, _ts: ts },
        });
        setSec1Data(res.data || {});
      }

      // SECTION 2
      if (activeTab === 1) {
        const { startDate, endDate } = getDatesFromPeriod(pipelinePeriod);
        const res = await axios.get("/api/agent/customers/summary-dashboard", {
          params: { section: "2", startDate, endDate, mode, _ts: ts },
        });
        setSec2Data(Array.isArray(res.data) ? res.data : []);
      }

      // SECTION 3
      if (activeTab === 2) {
        const { startDate, endDate } = getDatesFromPeriod(sec3Period);
        const res = await axios.get("/api/agent/customers/summary-dashboard", {
          params: { section: "3", projectId: selectedProject, startDate, endDate, _ts: ts },
        });
        setSec3Data(Array.isArray(res.data) ? res.data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [activeTab, selectedProject, period, pipelinePeriod, mode, sec3Period, user]);

  const getCount = (data: Record<string, number>, code: string) => data?.[code] ?? 0;

  /* ---------------- UI COMPONENTS ---------------- */

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

/* ---------------- BOX STYLE MATRIX TABLE ---------------- */
  const MatrixTable = ({ 
    rows, 
    data, 
    totalLabel = "Total", 
    isPipeline = false 
  }: any) => {
    const days = [
      { label: "Mon", sql: 2 }, { label: "Tue", sql: 3 }, { label: "Wed", sql: 4 },
      { label: "Thu", sql: 5 }, { label: "Fri", sql: 6 }, { label: "Sat", sql: 7 }, { label: "Sun", sql: 1 },
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
                          className={`p-2 text-center border border-slate-300 ${c > 0 ? "text-blue-600 font-bold bg-blue-50/50" : "text-slate-300"}`}
                        >
                          {/* CHANGED: Removed ternary check. Just show 'c'. If 0, it shows 0. */}
                          {c}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300">{rowTotal}</td>
                  </tr>
                );
              })}
              
              {/* Grand Total Row */}
              <tr className="bg-slate-100 font-bold">
                <td className="p-2 text-slate-800 uppercase text-xs tracking-wider border border-slate-300">{totalLabel}</td>
                {days.map(d => {
                    grandTotal += colTotals[d.sql];
                    const val = colTotals[d.sql];
                    return (
                        <td 
                          key={d.label} 
                          className={`p-2 text-center border border-slate-300 ${val > 0 ? "text-blue-800" : "text-slate-300 font-normal"}`}
                        >
                            {val}
                        </td>
                    )
                })}
                <td className="p-2 text-center text-lg text-blue-900 bg-blue-100 border border-slate-300">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ---------------- SECTIONS ---------------- */

  const renderSection1 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FilterBar>
        <StyledSelect
          icon={Briefcase}
          value={selectedProject}
          onChange={(e: any) => setSelectedProject(e.target.value)}
          options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>}
        />
        <StyledSelect
          icon={Calendar}
          value={period}
          onChange={(e: any) => setPeriod(e.target.value)}
          options={<><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option></>}
        />
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          ["Visit Proposed", "visit-proposed", "text-blue-600", "bg-blue-50"],
          ["Visit Confirmed", "visit-confirmed", "text-indigo-600", "bg-indigo-50"],
          ["Virtual Meet", "virtual-meet", "text-purple-600", "bg-purple-50"],
          ["Virtual Meet Confirmed", "virtual-meet-confirmed", "text-fuchsia-600", "bg-fuchsia-50"],
          ["Visit Done", "visit-done", "text-orange-600", "bg-orange-50"],
          ["Booking Done", "booking-done", "text-emerald-600", "bg-emerald-50"],
        ].map(([label, code, colorClass, bgClass]) => (
          <Card key={code} className="border-none shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className={`text-4xl font-bold ${colorClass} group-hover:scale-105 transition-transform origin-left`}>
                  {getCount(sec1Data, code as string)}
                </div>
                <div className={`p-2 rounded-full ${bgClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                   <div className={`w-2 h-2 rounded-full ${colorClass.replace('text', 'bg')}`}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSection2 = () => {
    const pipelineRows = [
      { label: "Visit Proposed", code: "visit-proposed" },
      { label: "Visit Confirmed", code: "visit-confirmed" },
      { label: "Virtual Meet Confirmed", code: "virtual-meet-confirmed" },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <FilterBar>
          <StyledSelect
            icon={Calendar}
            value={pipelinePeriod} 
            onChange={(e: any) => setPipelinePeriod(e.target.value)}
            options={<><option>Past Week</option><option>This Week</option><option>Next Week</option></>}
          />
          <StyledSelect
            icon={Layers}
            value={mode}
            onChange={(e: any) => setMode(e.target.value)}
            options={<><option value="all">All Leads</option><option value="fresh">Fresh (Same Day)</option><option value="repeated">Repeated (Pushed)</option></>}
          />
        </FilterBar>
        
        <MatrixTable rows={pipelineRows} data={sec2Data} totalLabel="Total Pipeline" isPipeline={true} />
      </div>
    );
  };

  const renderSection3 = () => {
    const allRows = ALL_STATUSES.map(s => ({ label: s.replace(/-/g, " "), code: s }));

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <FilterBar>
          <StyledSelect
            icon={Briefcase}
            value={selectedProject}
            onChange={(e: any) => setSelectedProject(e.target.value)}
            options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>}
          />
          <StyledSelect
            icon={Calendar}
            value={sec3Period}
            onChange={(e: any) => setSec3Period(e.target.value)}
            options={<><option>Past Week</option><option>This Week</option><option>This Month</option></>}
          />
        </FilterBar>

        <MatrixTable rows={allRows} data={sec3Data} totalLabel="Grand Total" isPipeline={false} />
      </div>
    );
  };

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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Fetching analytics...</p>
        </div>
      ) : (
        <>
          {activeTab === 0 && renderSection1()}
          {activeTab === 1 && renderSection2()}
          {activeTab === 2 && renderSection3()}
        </>
      )}
    </div>
    </AppShell>
  );
}