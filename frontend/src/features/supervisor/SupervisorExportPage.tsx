import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios"; 
import { AppShell } from "@/components/ui/app-shell";
import { ArrowLeft, Calendar as CalendarIcon , Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

// 1. Define Types for your data
interface Agent {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

export default function SupervisorExportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 2. Add types to State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Date States (Default to current date)
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState<boolean>(false);

  const STATUS_OPTIONS = [
    "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", 
    "visit-proposed", "not-reachable", "virtual-meet", "pending", "completed", "lost", "visit-done", "booking-done"
  ];

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const [agentRes, projectRes] = await Promise.all([
        axios.get("/api/supervisor/summary-dashboard?section=associates"),
        axios.get("/api/supervisor/summary-dashboard?section=projects"),
      ]);
      // Ensure we are setting arrays
      setAgents(Array.isArray(agentRes.data) ? agentRes.data : []);
      setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
    } catch (err) {
      console.error("Error loading filters", err);
    }
  };

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/supervisor/export`, {
        params: {
          format,
          agentId: selectedAgent,
          projectId: selectedProject,
          status: selectedStatus,
          startDate,
          endDate
        },
        responseType: 'blob', // IMPORTANT: This allows handling binary file data
      });

      // Create a link to download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().slice(0,10);
      
      // Set the correct extension
      link.setAttribute('download', `AMS_Export_${timestamp}.${format}`);
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed", error);
      alert("Failed to download file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If user is not loaded yet or invalid (optional check)
  if (!user) return <div>Loading...</div>;

  return (
    <AppShell sidebar={null}>
      <div className="p-4 md:p-8 max-w-4xl mx-auto font-sans">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
             <ArrowLeft className="w-5 h-5 text-slate-600"/>
          </button>
          <div>
             <h1 className="text-2xl font-bold text-slate-900">Export Data</h1>
             <p className="text-slate-500">Generate customized reports from the database.</p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600"/> Report Criteria
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Date Range */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">From Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">To Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                />
            </div>

            {/* Agent */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Agent</label>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  <option value="all">All Agents</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {/* Project */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Project</label>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {/* Status */}
            <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Filter by Status</label>
                <select 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none capitalize"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>)}
                </select>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            disabled={loading}
            onClick={() => handleDownload('csv')}
            className="flex items-center justify-center gap-3 p-4 bg-green-50 border-2 border-green-200 hover:bg-green-100 hover:border-green-500 text-green-800 rounded-xl transition-all font-semibold disabled:opacity-50"
          >
             {loading ? <span className="animate-pulse">Generating...</span> : (
               <>
                 <Download className="w-6 h-6"/> Download CSV
               </>
             )}
          </button>

          <button 
             disabled={loading}
             onClick={() => handleDownload('xlsx')}
             className="flex items-center justify-center gap-3 p-4 bg-blue-50 border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 rounded-xl transition-all font-semibold text-slate-600 disabled:opacity-50"
          >
             {loading ? <span className="animate-pulse">Generating...</span> : (
               <>
                 <Download className="w-6 h-6"/> Download XLSX
               </>
             )}
          </button>
        </div>

      </div>
    </AppShell>
  );
}