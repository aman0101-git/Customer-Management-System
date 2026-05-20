import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { AppShell } from "@/components/ui/app-shell";
import { format, isBefore, isToday, startOfDay, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  AlertCircle,
  Briefcase,
  User,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

// Phase 5 (May 2026):
//   - Sticky table header so column labels stay visible while scrolling.
//   - Spinner replaced with KPI + table skeleton (consistent with Phase 1
//     dashboard skeletons).
//   - counts and displayList memoized; the previous code re-ran 3 filter
//     passes per render plus another for displayList. Now O(N) once per
//     data/filter change.
//   - fetch/filter logic and API contracts unchanged.

// 1. Define the Options Constant
const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "virtual-meet", "pending"
];

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
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'today' | 'future'>('all');
  const [loading, setLoading] = useState(true);

  // Initial Load
  useEffect(() => {
    if (user) {
        fetchFilters();
        fetchData();
    }
  }, [user]);

  // Refetch on filter change (unchanged)
  useEffect(() => {
    if (user && !loading) fetchData();
  }, [selectedAgent, selectedProject, selectedStatus]);

  const fetchFilters = async () => {
    try {
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
        params: {
            agentId: selectedAgent,
            projectId: selectedProject,
            status: selectedStatus
        }
      });

      const todayStart = startOfDay(new Date());

      const processed = (res.data || []).map((item: any) => {
        const fDate = parseISO(item.follow_up_date);
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

  // Phase 5: counts memoized — one pass instead of three filter passes per render.
  const counts = useMemo(() => {
    let past = 0, today = 0, future = 0;
    for (const i of data) {
      if (i.category === 'past') past++;
      else if (i.category === 'today') today++;
      else if (i.category === 'future') future++;
    }
    return { past, today, future };
  }, [data]);

  const displayList = useMemo(() => {
    return timeFilter === 'all' ? data : data.filter(i => i.category === timeFilter);
  }, [data, timeFilter]);

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
             <div className="relative min-w-[180px]">
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
             <div className="relative min-w-[180px]">
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

             {/* Status Dropdown */}
             <div className="relative min-w-[180px]">
               <select
                 className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer capitalize"
                 value={selectedStatus}
                 onChange={(e) => setSelectedStatus(e.target.value)}
               >
                 <option value="all">All Status</option>
                 {STATUS_OPTIONS.map((status) => (
                   <option key={status} value={status}>
                     {status.replace(/-/g, ' ')}
                   </option>
                 ))}
               </select>
               <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
             </div>
          </div>
        </div>

        {/* KPI CARDS — show skeletons while loading the first batch so the
            page layout doesn't jump on data arrival. */}
        {loading && data.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
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
        )}

        {/* DATA TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : displayList.length === 0 ? (
             <div className="text-center p-20 text-slate-500">No follow-ups found for the selected criteria.</div>
          ) : (
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3 bg-slate-50">Customer & Agent</th>
                    <th className="px-6 py-3 bg-slate-50">Contact</th>
                    <th className="px-6 py-3 bg-slate-50">Project</th>
                    <th className="px-6 py-3 bg-slate-50">Status</th>
                    <th className="px-6 py-3 bg-slate-50">Follow Up Date</th>
                    <th className="px-6 py-3 bg-slate-50">Updated</th>
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

                      {/* Follow Up */}
                      <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                             <span className={`font-semibold ${item.category === 'past' ? 'text-red-600' : 'text-slate-700'}`}>
                                {format(item.parsedDate, "dd MMM yyyy")}
                             </span>
                             <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
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
