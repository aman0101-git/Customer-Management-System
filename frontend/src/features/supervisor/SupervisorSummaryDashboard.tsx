import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
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
import { Loader2, Calendar, Filter, Briefcase, Layers, Users, ChevronDown } from "lucide-react";
import { AppShell } from "@/components/ui/app-shell";

/* ---------------- STYLISH UI HELPERS ---------------- */

// 1. Modern Segmented Tabs
const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl mb-8 w-fit border border-slate-200 shadow-sm">
    {labels.map((label: string, idx: number) => (
      <button
        key={idx}
        onClick={() => setActive(idx)}
        className={`relative px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ease-out ${
          active === idx
            ? "bg-white text-indigo-700 shadow-md ring-1 ring-black/5 translate-y-0"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        }`}
      >
        {label}
        {active === idx && (
           <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full" />
        )}
      </button>
    ))}
  </div>
);

// 2. Glassmorphic Filter Bar
const FilterBar = ({ children }: any) => (
  <div className="flex flex-col xl:flex-row gap-4 mb-8 bg-white/80 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-slate-200/60 items-start xl:items-center justify-between sticky top-4 z-10 transition-all">
    <div className="flex items-center gap-3 text-slate-600">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
        <Filter className="w-5 h-5" />
      </div>
      <div>
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">View Controls</span>
        <span className="text-sm font-semibold">Filter Data</span>
      </div>
    </div>
    <div className="flex flex-wrap gap-3 w-full xl:w-auto items-center">{children}</div>
  </div>
);

// 3. Premium Select Input
const StyledSelect = ({ value, onChange, options, icon: Icon }: any) => (
  <div className="relative group min-w-[180px]">
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
      {Icon && <Icon className="w-4 h-4" />}
    </div>
    <select
      className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm transition-all cursor-pointer hover:border-indigo-300 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none appearance-none"
      value={value}
      onChange={onChange}
    >
      {options}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      <ChevronDown className="w-4 h-4" />
    </div>
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

export default function SupervisorSummaryDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  // Filters
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  
  // Date Filters
  const [period, setPeriod] = useState("This Week"); 
  const [pipelinePeriod, setPipelinePeriod] = useState("This Week"); 
  const [sec3Period, setSec3Period] = useState("This Week"); 
  const [mode, setMode] = useState("all"); 

  // Data
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sec1Data, setSec1Data] = useState<Record<string, number>>({});
  const [sec2Data, setSec2Data] = useState<any[]>([]);
  const [sec3Data, setSec3Data] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Date Calculation Helper ---
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

  const getCount = (data: Record<string, number>, code: string) => data?.[code] ?? 0;

  // --- API CALLS ---
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [agentRes, projRes] = await Promise.all([
          axios.get("/api/supervisor/summary-dashboard?section=associates"),
          axios.get("/api/supervisor/summary-dashboard?section=projects")
        ]);
        setAgents(Array.isArray(agentRes.data) ? agentRes.data : []);
        setProjects(Array.isArray(projRes.data) ? projRes.data : []);
      } catch (e) { console.error("Filter load error", e); }
    };
    if (user) loadFilters();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const baseUrl = "/api/supervisor/summary-dashboard";
        
        if (activeTab === 0) {
          const { startDate, endDate } = getDatesFromPeriod(period);
          const res = await axios.get(baseUrl, { 
            params: { section: "1", agentId: selectedAgent, projectId: selectedProject, startDate, endDate } 
          });
          setSec1Data(res.data);
        }
        else if (activeTab === 1) {
          const { startDate, endDate } = getDatesFromPeriod(pipelinePeriod);
          const res = await axios.get(baseUrl, { 
            params: { section: "2", agentId: selectedAgent, projectId: selectedProject, startDate, endDate, mode } 
          });
          setSec2Data(Array.isArray(res.data) ? res.data : []);
        }
        else if (activeTab === 2) {
          const { startDate, endDate } = getDatesFromPeriod(sec3Period);
          const res = await axios.get(baseUrl, { 
            params: { section: "3", agentId: selectedAgent, projectId: selectedProject, startDate, endDate } 
          });
          setSec3Data(Array.isArray(res.data) ? res.data : []);
        }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [user, activeTab, selectedAgent, selectedProject, period, pipelinePeriod, sec3Period, mode]);

  // --- RENDER SECTIONS ---

  // Reusable Selects
  const AgentSelect = () => (
    <StyledSelect 
      icon={Users} value={selectedAgent} onChange={(e: any) => setSelectedAgent(e.target.value)}
      options={<><option value="all">All Agents</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</>} 
    />
  );
  const ProjectSelect = () => (
    <StyledSelect 
      icon={Briefcase} value={selectedProject} onChange={(e: any) => setSelectedProject(e.target.value)}
      options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>} 
    />
  );

  // 4. Enhanced Cards with Stats
  const renderSection1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <FilterBar>
        <div className="flex flex-wrap gap-3">
            <AgentSelect />
            <ProjectSelect />
        </div>
        <StyledSelect icon={Calendar} value={period} onChange={(e: any) => setPeriod(e.target.value)}
          options={<><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option></>} 
        />
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          ["Visit Proposed", "visit-proposed", "text-blue-600", "bg-blue-50", "border-blue-100"],
          ["Visit Confirmed", "visit-confirmed", "text-indigo-600", "bg-indigo-50", "border-indigo-100"],
          ["Virtual Meet", "virtual-meet", "text-purple-600", "bg-purple-50", "border-purple-100"],
          ["Virtual Confirmed", "virtual-meet-confirmed", "text-fuchsia-600", "bg-fuchsia-50", "border-fuchsia-100"],
          ["Visit Done", "visit-done", "text-orange-600", "bg-orange-50", "border-orange-100"],
          ["Booking Done", "booking-done", "text-emerald-600", "bg-emerald-50", "border-emerald-100"],
        ].map(([label, code, color, bg, border]) => (
          <div key={code} className={`group relative bg-white rounded-2xl border ${border} p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-default`}>
             <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</h3>
                <div className={`p-2 rounded-xl ${bg} ${color}`}>
                  <Layers className="w-5 h-5" />
                </div>
             </div>
             <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold tracking-tight ${color} drop-shadow-sm`}>
                    {getCount(sec1Data, code)}
                </span>
                <span className="text-sm text-slate-400 font-medium">Leads</span>
             </div>
             {/* Decorative Background Blob */}
             <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${bg} opacity-50 blur-2xl group-hover:opacity-100 transition-opacity`} />
          </div>
        ))}
      </div>
    </div>
  );

  // 5. Polished Data Table
  const MatrixTable = ({ rows, data, isPipeline }: any) => {
    const days = [ {l:"Mon",n:2}, {l:"Tue",n:3}, {l:"Wed",n:4}, {l:"Thu",n:5}, {l:"Fri",n:6}, {l:"Sat",n:7}, {l:"Sun",n:1} ];
    let grandTotal = 0; const colTotals: any = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
             <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
               <tr>
                 <th className="p-4 text-left w-56 pl-6 uppercase text-xs tracking-wider">Status Category</th>
                 {days.map(d=><th key={d.l} className="p-4 text-center w-24">{d.l}</th>)}
                 <th className="p-4 text-center bg-slate-100/50 w-32 border-l border-slate-200 uppercase text-xs tracking-wider">Total</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {rows.map((r: any) => {
                  let rTot = 0;
                  return (
                   <tr key={r.code} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="p-4 pl-6 font-medium text-slate-700 capitalize flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 transition-colors" />
                        {r.label}
                     </td>
                     {days.map(d => {
                        const rec = data.find((x: any) => x.status_code === r.code && x.day_num === d.n);
                        let c = 0;
                        if(isPipeline && rec) c = mode === "fresh" ? rec.fresh : mode === "repeated" ? rec.repeated : (Number(rec.fresh)+Number(rec.repeated));
                        else if(rec) c = rec.count;
                        rTot += Number(c); colTotals[d.n] += Number(c);
                        
                        return (
                           <td key={d.l} className="p-4 text-center">
                              {c > 0 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm shadow-sm ring-1 ring-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                   {c}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-light">-</span>
                              )}
                           </td>
                        )
                     })}
                     <td className="p-4 text-center font-bold text-slate-800 bg-slate-50/50 border-l border-slate-100">{rTot}</td>
                   </tr>
                  )
               })}
               <tr className="bg-indigo-50/30 border-t-2 border-slate-100">
                 <td className="p-4 pl-6 font-bold text-slate-700 uppercase tracking-wider text-xs">Weekly Totals</td>
                 {days.map(d => { 
                    grandTotal+=colTotals[d.n]; 
                    return <td key={d.l} className="p-4 text-center font-semibold text-slate-600">{colTotals[d.n] || "-"}</td> 
                 })}
                 <td className="p-4 text-center text-lg font-bold text-indigo-700 bg-indigo-50/50 border-l border-indigo-100">{grandTotal}</td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSection2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <FilterBar>
         <div className="flex flex-wrap gap-3"><AgentSelect /><ProjectSelect /></div>
         <div className="flex flex-wrap gap-3">
           <StyledSelect icon={Calendar} value={pipelinePeriod} onChange={(e: any) => setPipelinePeriod(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>Next Week</option></>} />
           <StyledSelect icon={Layers} value={mode} onChange={(e: any) => setMode(e.target.value)} options={<><option value="all">All Leads</option><option value="fresh">Fresh</option><option value="repeated">Repeated</option></>} />
         </div>
      </FilterBar>
      <MatrixTable isPipeline={true} data={sec2Data} rows={[{label:"Visit Proposed",code:"visit-proposed"},{label:"Visit Confirmed",code:"visit-confirmed"},{label:"Virtual Meet Confirmed",code:"virtual-meet-confirmed"}]} />
    </div>
  );

  const renderSection3 = () => {
    const allRows = ["visit-proposed","visit-confirmed","virtual-meet","virtual-meet-confirmed","visit-done","booking-done","lost","follow-up","sdow","not-reachable","pending"].map(s => ({label: s.replace(/-/g, " "), code: s}));
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <FilterBar>
           <div className="flex flex-wrap gap-3"><AgentSelect /><ProjectSelect /></div>
           <StyledSelect icon={Calendar} value={sec3Period} onChange={(e: any) => setSec3Period(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>This Month</option></>} />
        </FilterBar>
        <MatrixTable isPipeline={false} data={sec3Data} rows={allRows} />
      </div>
    );
  };

  return (
    <AppShell sidebar={null}>
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-10 max-w-7xl mx-auto font-sans">
      <div className="mb-10">
         <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Supervisor <span className="text-indigo-600">Overview</span></h1>
         <p className="text-slate-500 text-lg">Real-time insights into your team's performance and pipeline.</p>
      </div>

      <Tabs active={activeTab} setActive={setActiveTab} labels={["Visits & Booking", "Weekly Pipeline", "Status Counts"]} />
      
      {loading ? (
          <div className="h-96 w-full flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200">
             <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4"/>
             <span className="text-slate-400 font-medium animate-pulse">Synchronizing Data...</span>
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