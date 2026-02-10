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
import { Loader2, Calendar, Filter, Briefcase, Layers, Users, ChevronDown } from "lucide-react";

/* ---------------- COMPACT UI HELPERS ---------------- */

// 1. Compact Tabs
const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex p-1 bg-slate-100 rounded-lg mb-4 w-fit border border-slate-200">
    {labels.map((label: string, idx: number) => (
      <button
        key={idx}
        onClick={() => setActive(idx)}
        className={`relative px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200 ease-out ${
          active === idx
            ? "bg-white text-indigo-700 shadow-sm ring-1 ring-black/5"
            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

// 2. Compact Filter Bar
const FilterBar = ({ children }: any) => (
  <div className="flex flex-col xl:flex-row gap-3 mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-200 items-center justify-between">
    <div className="flex items-center gap-2 text-slate-600">
      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
        <Filter className="w-4 h-4" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
    </div>
    <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">{children}</div>
  </div>
);

// 3. Compact Select
const StyledSelect = ({ value, onChange, options, icon: Icon }: any) => (
  <div className="relative group min-w-[160px]">
    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
      {Icon && <Icon className="w-3.5 h-3.5" />}
    </div>
    <select
      className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition-all cursor-pointer hover:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none appearance-none"
      value={value}
      onChange={onChange}
    >
      {options}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
      <ChevronDown className="w-3.5 h-3.5" />
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
  // Ensuring weekStartsOn: 1 (Monday)
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

  // 4. Cards (Section 1)
  const renderSection1 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <FilterBar>
        <div className="flex flex-wrap gap-2">
            <AgentSelect />
            <ProjectSelect />
        </div>
        <StyledSelect icon={Calendar} value={period} onChange={(e: any) => setPeriod(e.target.value)}
          options={<><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option></>} 
        />
      </FilterBar>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ["Visit Proposed", "visit-proposed", "text-blue-600", "bg-blue-50", "border-blue-200"],
          ["Visit Confirmed", "visit-confirmed", "text-indigo-600", "bg-indigo-50", "border-indigo-200"],
          ["Virtual Meet", "virtual-meet", "text-purple-600", "bg-purple-50", "border-purple-200"],
          ["Virtual Done", "virtual-meet-confirmed", "text-fuchsia-600", "bg-fuchsia-50", "border-fuchsia-200"],
          ["Visit Done", "visit-done", "text-orange-600", "bg-orange-50", "border-orange-200"],
          ["Booking", "booking-done", "text-emerald-600", "bg-emerald-50", "border-emerald-200"],
        ].map(([label, code, color, border]) => (
          <div key={code} className={`bg-white rounded-xl border ${border} p-3 shadow-sm hover:shadow-md transition-all`}>
             <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{label}</h3>
             </div>
             <div className="flex items-end gap-1">
                <span className={`text-3xl font-bold tracking-tight ${color}`}>
                    {getCount(sec1Data, code)}
                </span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 5. TRUE MATRIX TABLE (Boxed, Grid Lines, Compact)
  const MatrixTable = ({ rows, data, isPipeline }: any) => {
    // FIX: Updated `n` values to match Backend WEEKDAY()+1 (Mon=1, Sun=7)
    const days = [ {l:"Mon",n:1}, {l:"Tue",n:2}, {l:"Wed",n:3}, {l:"Thu",n:4}, {l:"Fri",n:5}, {l:"Sat",n:6}, {l:"Sun",n:7} ];
    let grandTotal = 0; const colTotals: any = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
          {/* Using border-collapse for the true grid/box look */}
          <table className="w-full text-xs border-collapse">
             <thead>
               <tr className="bg-slate-100 text-slate-700">
                 <th className="p-3 text-left w-48 border border-slate-300 font-bold uppercase tracking-wider">Status</th>
                 {days.map(d=><th key={d.l} className="p-3 text-center w-16 border border-slate-300 font-bold">{d.l}</th>)}
                 <th className="p-3 text-center w-20 border border-slate-300 bg-slate-200 font-bold text-slate-900">Total</th>
               </tr>
             </thead>
             <tbody>
               {rows.map((r: any, idx: number) => {
                  let rTot = 0;
                  // Alternating row colors for better readability
                  const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
                  
                  return (
                   <tr key={r.code} className={`${rowBg} hover:bg-indigo-50 transition-colors`}>
                     <td className="p-2 pl-3 font-semibold text-slate-700 capitalize border border-slate-300">
                        {r.label}
                     </td>
                     {days.map(d => {
                        const rec = data.find((x: any) => x.status_code === r.code && x.day_num === d.n);
                        let c = 0;
                        if(isPipeline && rec) c = mode === "fresh" ? rec.fresh : mode === "repeated" ? rec.repeated : (Number(rec.fresh)+Number(rec.repeated));
                        else if(rec) c = rec.count;
                        rTot += Number(c); colTotals[d.n] += Number(c);
                        
                        return (
                           <td key={d.l} className="p-2 text-center border border-slate-300">
                              {c > 0 ? (
                                <span className="font-bold text-indigo-600">
                                   {c}
                                </span>
                              ) : (
                                // Faint 0
                                <span className="text-slate-200 font-medium">0</span>
                              )}
                           </td>
                        )
                     })}
                     <td className="p-2 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300">
                        {rTot > 0 ? rTot : <span className="text-slate-300">0</span>}
                     </td>
                   </tr>
                  )
               })}
               <tr className="bg-slate-800 text-white border-t-2 border-slate-300">
                 <td className="p-3 pl-3 font-bold uppercase tracking-wider border border-slate-600">Grand Total</td>
                 {days.map(d => { 
                    grandTotal+=colTotals[d.n]; 
                    return (
                        <td key={d.l} className="p-3 text-center font-bold border border-slate-600">
                            {colTotals[d.n] > 0 ? colTotals[d.n] : <span className="text-slate-600">0</span>}
                        </td>
                    )
                 })}
                 <td className="p-3 text-center text-sm font-extrabold bg-indigo-600 border border-indigo-700">{grandTotal}</td>
               </tr>
             </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSection2 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <FilterBar>
         <div className="flex flex-wrap gap-2"><AgentSelect /><ProjectSelect /></div>
         <div className="flex flex-wrap gap-2">
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
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <FilterBar>
           <div className="flex flex-wrap gap-2"><AgentSelect /><ProjectSelect /></div>
           <StyledSelect icon={Calendar} value={sec3Period} onChange={(e: any) => setSec3Period(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>This Month</option></>} />
        </FilterBar>
        <MatrixTable isPipeline={false} data={sec3Data} rows={allRows} />
      </div>
    );
  };

  return (
    <AppShell sidebar={null}>
    {/* Reduced padding from p-10 to p-4/p-6 */}
    <div className="min-h-screen bg-slate-50/50 p-2 md:p-6 max-w-7xl mx-auto font-sans">
      
      {/* Reduced Header Spacing */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Supervisor <span className="text-indigo-600">Overview</span></h1>
            <p className="text-slate-500 text-sm">Real-time team performance metrics.</p>
         </div>
         <Tabs active={activeTab} setActive={setActiveTab} labels={["Cards View", "Pipeline Grid", "Status Grid"]} />
      </div>

      {loading ? (
          <div className="h-64 w-full flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200">
             <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2"/>
             <span className="text-slate-400 text-sm font-medium animate-pulse">Loading Data...</span>
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