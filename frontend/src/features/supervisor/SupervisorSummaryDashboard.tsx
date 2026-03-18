import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
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
import { 
  Loader2, 
  Calendar, 
  Briefcase, 
  Layers, 
  Users, 
  Filter
} from "lucide-react";

/* ---------------- COMPACT UI HELPERS ---------------- */

const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
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

const SelectInput = ({ icon: Icon, value, onChange, options, minWidth = "min-w-[160px]" }: any) => (
  <div className={`relative ${minWidth}`}>
    <select 
      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer text-slate-700 appearance-none"
      value={value}
      onChange={onChange}
    >
      {options}
    </select>
    <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

export default function SupervisorSummaryDashboard() {
  const { user } = useAuth();
  
  // View State
  const [activeTab, setActiveTab] = useState(0);

  // Filter State
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  
  // Date/Mode Filters
  const [period, setPeriod] = useState("This Week"); 
  const [pipelinePeriod, setPipelinePeriod] = useState("This Week"); 
  const [sec3Period, setSec3Period] = useState("This Week"); 
  const [mode, setMode] = useState("all"); 

  // Data State
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sec1Data, setSec1Data] = useState<Record<string, number>>({});
  const [sec2Data, setSec2Data] = useState<any[]>([]);
  const [sec3Data, setSec3Data] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- DRILL DOWN MODAL STATE ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

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

    // FIX: Explicitly append time boundaries so MySQL includes the entire final day 
    // instead of stopping at Midnight (00:00:00) of the end date.
    return { 
      startDate: format(start, "yyyy-MM-dd") + " 00:00:00", 
      endDate: format(end, "yyyy-MM-dd") + " 23:59:59" 
    };
  };

  // --- DRILL DOWN HANDLER ---
  const handleDrillDown = async (statusCode: string, section: string, dayNum?: number) => {
    // 1. GUARD CLAUSE: Fixes "user is possibly null" error
    if (!user) return;

    setModalOpen(true);
    setModalLoading(true);
    // Title logic: If dayNum is present, it's a specific day, otherwise it's the Total
    const dayLabel = dayNum ? " (Day View)" : " (Total View)";
    setModalTitle(`${statusCode.replace(/-/g, " ")}${dayLabel}`);

    try {
      let usePeriod = period; 
      if (section === 'pipeline') usePeriod = pipelinePeriod;
      if (section === 'volume') usePeriod = sec3Period;

      const { startDate, endDate } = getDatesFromPeriod(usePeriod);

      const res = await axios.get("/api/supervisor/drill-down", {
        params: {
          supervisorId: user.id,
          agentId: selectedAgent,
          projectId: selectedProject,
          startDate,
          endDate,
          statusCode,
          section,
          dayNum // If undefined (Total column), backend will fetch range without day filter
        }
      });
      setModalData(res.data);
    } catch (e) {
      console.error("Drill down error", e);
    } finally {
      setModalLoading(false);
    }
  };

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

  const AgentFilter = () => (
    <SelectInput 
      icon={Users} value={selectedAgent} onChange={(e: any) => setSelectedAgent(e.target.value)}
      options={<><option value="all">All Agents</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</>}
    />
  );
  
  const ProjectFilter = () => (
    <SelectInput 
      icon={Briefcase} value={selectedProject} onChange={(e: any) => setSelectedProject(e.target.value)}
      options={<><option value="all">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</>}
    />
  );

  // --- RENDER SECTIONS ---

  // 1. Cards (Section 1)
  const getCount = (data: Record<string, number>, code: string) => data?.[code] ?? 0;

  const renderSection1 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-2 text-slate-600 w-full md:w-auto">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><Filter className="w-4 h-4" /></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           <AgentFilter />
           <ProjectFilter />
           <SelectInput 
             icon={Calendar} value={period} onChange={(e: any) => setPeriod(e.target.value)}
             options={<><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option></>}
           />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          ["Follow Up", "follow-up", "text-cyan-600", "bg-cyan-50", "border-cyan-200"],
          ["Visit Proposed", "visit-proposed", "text-blue-600", "bg-blue-50", "border-blue-200"],
          ["Visit Confirmed", "visit-confirmed", "text-indigo-600", "bg-indigo-50", "border-indigo-200"],
          ["Virtual Meet", "virtual-meet", "text-purple-600", "bg-purple-50", "border-purple-200"],
          ["Virtual Done", "virtual-meet-confirmed", "text-fuchsia-600", "bg-fuchsia-50", "border-fuchsia-200"],
          ["Visit Done", "visit-done", "text-orange-600", "bg-orange-50", "border-orange-200"],
          ["Booking", "booking-done", "text-emerald-600", "bg-emerald-50", "border-emerald-200"],
          ["SDOW", "sdow", "text-amber-600", "bg-amber-50", "border-amber-200"],
          ["Not Reachable", "not-reachable", "text-rose-600", "bg-rose-50", "border-rose-200"],
          ["Lost", "lost", "text-slate-600", "bg-slate-50", "border-slate-200"],
        ].map(([label, code, color, border]) => (
          // --- UPDATED: WHOLE CARD IS CLICKABLE ---
          <div 
            key={code} 
            onClick={() => handleDrillDown(code, 'cards')}
            className={`bg-white rounded-xl border ${border} p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
          >
             <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight group-hover:text-indigo-600 transition-colors">{label}</h3>
             </div>
             <div className="flex items-end gap-1">
                <span className={`text-3xl font-bold tracking-tight ${color} group-hover:scale-105 transition-transform`}>
                   {getCount(sec1Data, code)}
                </span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 2. Matrix Table Logic
  const MatrixTable = ({ rows, data, isPipeline }: any) => {
    const days = [ {l:"Mon",n:1}, {l:"Tue",n:2}, {l:"Wed",n:3}, {l:"Thu",n:4}, {l:"Fri",n:5}, {l:"Sat",n:6}, {l:"Sun",n:7} ];
    let grandTotal = 0; 
    const colTotals: any = {1:0,2:0,3:0,4:0,5:0,6:0,7:0};
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
        <div className="overflow-x-auto">
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
                           <td 
                                key={d.l} 
                                onClick={() => c > 0 && handleDrillDown(r.code, isPipeline ? 'pipeline' : 'volume', d.n)}
                                className={`p-2 text-center border border-slate-300 transition-all ${c > 0 ? 'cursor-pointer hover:bg-slate-100 active:bg-slate-200' : ''}`}
                           >
                             {c > 0 ? (
                               <span className="font-bold text-indigo-600">{c}</span>
                             ) : (
                               <span className="text-slate-200 font-medium">0</span>
                             )}
                           </td>
                       )
                     })}
                     
                     {/* ROW TOTAL (Right Column) */}
                     <td 
                        onClick={() => rTot > 0 && handleDrillDown(r.code, isPipeline ? 'pipeline' : 'volume')}
                        className={`p-2 text-center font-bold text-slate-800 bg-slate-100 border border-slate-300 transition-all ${rTot > 0 ? 'cursor-pointer hover:bg-slate-200 active:bg-slate-300' : ''}`}
                     >
                        {rTot > 0 ? rTot : <span className="text-slate-300">0</span>}
                     </td>
                   </tr>
                  )
               })}
               
               {/* --- GRAND TOTAL ROW (Bottom) --- */}
               <tr className="bg-slate-800 text-white border-t-2 border-slate-300">
                 <td className="p-3 pl-3 font-bold uppercase tracking-wider border border-slate-600">Grand Total</td>
                 {days.map(d => { 
                   grandTotal+=colTotals[d.n]; 
                   const c = colTotals[d.n];
                   return (
                       <td 
                           key={d.l} 
                           // Click Handler for Column Total (e.g., All Monday)
                           onClick={() => c > 0 && handleDrillDown('all', isPipeline ? 'pipeline' : 'volume', d.n)}
                           className={`p-3 text-center font-bold border border-slate-600 transition-all ${c > 0 ? 'cursor-pointer hover:bg-slate-700' : ''}`}
                       >
                           {c > 0 ? c : <span className="text-slate-600">0</span>}
                       </td>
                   )
                 })}
                 
                 {/* ABSOLUTE GRAND TOTAL (Bottom Right Corner) */}
                 <td 
                    onClick={() => grandTotal > 0 && handleDrillDown('all', isPipeline ? 'pipeline' : 'volume')}
                    className={`p-3 text-center text-sm font-extrabold bg-indigo-600 border border-indigo-700 transition-all ${grandTotal > 0 ? 'cursor-pointer hover:bg-indigo-500' : ''}`}
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
         <div className="flex flex-wrap gap-2 w-full md:w-auto"><AgentFilter /><ProjectFilter /></div>
         <div className="flex flex-wrap gap-2 w-full md:w-auto">
           <SelectInput icon={Calendar} value={pipelinePeriod} onChange={(e: any) => setPipelinePeriod(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>Next Week</option></>} />
           <SelectInput icon={Layers} value={mode} onChange={(e: any) => setMode(e.target.value)} options={<><option value="all">All Leads</option><option value="fresh">Fresh</option><option value="repeated">Repeated</option></>} />
         </div>
      </div>
      <MatrixTable isPipeline={true} data={sec2Data} rows={[{label:"Visit Proposed",code:"visit-proposed"},{label:"Visit Confirmed",code:"visit-confirmed"},{label:"Virtual Meet Confirmed",code:"virtual-meet-confirmed"}]} />
    </div>
  );

  const renderSection3 = () => {
    const allRows = ["visit-proposed","visit-confirmed","virtual-meet","virtual-meet-confirmed","visit-done","booking-done","lost","follow-up","sdow","not-reachable","pending"].map(s => ({label: s.replace(/-/g, " "), code: s}));
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 justify-between items-center">
           <div className="flex flex-wrap gap-2 w-full md:w-auto"><AgentFilter /><ProjectFilter /></div>
           <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <SelectInput icon={Calendar} value={sec3Period} onChange={(e: any) => setSec3Period(e.target.value)} options={<><option>Past Week</option><option>This Week</option><option>This Month</option></>} />
           </div>
        </div>
        <MatrixTable isPipeline={false} data={sec3Data} rows={allRows} />
      </div>
    );
  };

  return (
    <AppShell sidebar={null}>
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 max-w-7xl mx-auto font-sans">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Supervisor <span className="text-indigo-600">Overview</span></h1>
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

      {/* Drill Down Modal */}
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