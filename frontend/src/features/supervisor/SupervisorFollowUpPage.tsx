import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios"; 
import { AppShell } from "@/components/ui/app-shell";
import { format, isBefore, isToday, startOfDay, parseISO } from "date-fns";
import { 
  Loader2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Briefcase,
  User,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SupervisorFollowUpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [data, setData] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Filter State
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'today' | 'future'>('all');
  const [loading, setLoading] = useState(true);

  // Initial Load
  useEffect(() => {
    if (user) {
        fetchFilters();
        fetchData();
    }
  }, [user]);

  // Fetch data when filters change (skip initial mount to avoid double fetch)
  useEffect(() => {
    if (user && !loading) fetchData();
  }, [selectedAgent, selectedProject]);

  const fetchFilters = async () => {
    try {
      // Using axios directly as per your SupervisorSummaryDashboard
      const [agentRes, projectRes] = await Promise.all([
        axios.get("/api/supervisor/summary-dashboard?section=associates"),
        axios.get("/api/supervisor/summary-dashboard?section=projects"),
      ]);
      setAgents(Array.isArray(agentRes.data) ? agentRes.data : []);
      setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
    } catch (err) {
      console.error("Error loading filters", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/supervisor/follow-ups`, {
        params: { agentId: selectedAgent, projectId: selectedProject }
      });
      
      // Categorize Data locally
      const todayStart = startOfDay(new Date());
      const processed = (res.data || []).map((item: any) => {
        // FIX: Parse the combined 'scheduled_at' timestamp from backend
        // This ensures both Date and Time are respected
        const fDate = parseISO(item.scheduled_at); 
        const itemDateStart = startOfDay(fDate);
        
        let category = 'future';
        
        if (isBefore(itemDateStart, todayStart)) category = 'past';
        else if (isToday(itemDateStart)) category = 'today';
        
        return { ...item, category, parsedDate: fDate };
      });

      setData(processed);
    } catch (err) {
      console.error("Failed to fetch followups", err);
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const counts = {
    past: data.filter(i => i.category === 'past').length,
    today: data.filter(i => i.category === 'today').length,
    future: data.filter(i => i.category === 'future').length
  };

  // Filter List for Display
  const displayList = timeFilter === 'all' 
    ? data 
    : data.filter(i => i.category === timeFilter);

  // --- STYLES ---
  const getRowStyle = (category: string) => {
    switch(category) {
      case 'past': return "bg-red-50/60 hover:bg-red-100 border-l-4 border-l-red-500";
      case 'today': return "bg-orange-50/60 hover:bg-orange-100 border-l-4 border-l-orange-500";
      default: return "hover:bg-slate-50 border-l-4 border-l-transparent";
    }
  };

  const getStatusBadge = (status: string) => {
    if(status?.includes('confirmed')) return "bg-green-100 text-green-700 border-green-200";
    if(status?.includes('proposed')) return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <AppShell sidebar={null}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">
        
        {/* HEADER & FILTERS */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600"/>
             </button>
             <div>
                <h1 className="text-xl font-bold text-slate-900">Follow-up Discipline</h1>
                <p className="text-sm text-slate-500">Monitor team schedule and overdue calls</p>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
             {/* Agent Dropdown */}
             <div className="relative min-w-[200px]">
               <select 
                 className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                 value={selectedAgent}
                 onChange={(e) => setSelectedAgent(e.target.value)}
               >
                 <option value="all">All Agents</option>
                 {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
               </select>
               <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
             </div>

             {/* Project Dropdown */}
             <div className="relative min-w-[200px]">
               <select 
                 className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                 value={selectedProject}
                 onChange={(e) => setSelectedProject(e.target.value)}
               >
                 <option value="all">All Projects</option>
                 {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
               <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Overdue */}
          <div 
            onClick={() => setTimeFilter(timeFilter === 'past' ? 'all' : 'past')}
            className={`cursor-pointer p-5 rounded-xl border transition-all ${timeFilter === 'past' ? 'bg-red-50 border-red-300 ring-2 ring-red-100' : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-md'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue</p>
                <h2 className="text-3xl font-bold text-red-600 mt-1">{counts.past}</h2>
              </div>
              <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle className="w-5 h-5"/></div>
            </div>
          </div>

          {/* Today */}
          <div 
            onClick={() => setTimeFilter(timeFilter === 'today' ? 'all' : 'today')}
            className={`cursor-pointer p-5 rounded-xl border transition-all ${timeFilter === 'today' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-100' : 'bg-white border-slate-200 hover:border-orange-300 hover:shadow-md'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Today</p>
                <h2 className="text-3xl font-bold text-orange-600 mt-1">{counts.today}</h2>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Clock className="w-5 h-5"/></div>
            </div>
          </div>

          {/* Upcoming */}
          <div 
            onClick={() => setTimeFilter(timeFilter === 'future' ? 'all' : 'future')}
            className={`cursor-pointer p-5 rounded-xl border transition-all ${timeFilter === 'future' ? 'bg-yellow-50 border-yellow-300 ring-2 ring-yellow-100' : 'bg-white border-slate-200 hover:border-yellow-300 hover:shadow-md'}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming</p>
                <h2 className="text-3xl font-bold text-yellow-600 mt-1">{counts.future}</h2>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Calendar className="w-5 h-5"/></div>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
                <span className="text-slate-400 text-sm">Loading follow-ups...</span>
             </div>
          ) : displayList.length === 0 ? (
             <div className="text-center p-20 text-slate-500">No follow-ups found for the selected criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Customer & Agent</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Project</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Follow Up Date</th>
                    <th className="px-6 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayList.map((item) => (
                    <tr key={item.agent_customer_id} className={`transition-colors ${getRowStyle(item.category)}`}>
                      
                      {/* Customer & Agent */}
                      <td className="px-6 py-3">
                        <div className="font-semibold text-slate-900">{item.customer_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" /> {item.agent_name}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-3 font-mono text-slate-600">{item.contact_number}</td>

                      {/* Project */}
                      <td className="px-6 py-3 text-slate-700">
                        <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {item.project_name || '-'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide border ${getStatusBadge(item.status_code)}`}>
                          {item.status_code?.replace(/-/g, ' ')}
                        </span>
                      </td>

                      {/* Follow Up - FIXED SECTION */}
                      <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                             <span className={`font-semibold ${item.category === 'past' ? 'text-red-600' : 'text-slate-700'}`}>
                                {/* Using the combined parsedDate for accurate date */}
                                {format(item.parsedDate, "dd MMM yyyy")}
                             </span>
                             <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {/* Using the combined parsedDate for accurate time */}
                                {format(item.parsedDate, "h:mm a")}
                             </span>
                          </div>
                      </td>

                        {/* Last Updated */}
                        <td className="px-6 py-3 text-xs text-slate-500">
                           {format(parseISO(item.updated_at), "dd MMM, HH:mm")}
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}