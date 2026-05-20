import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/ui/app-shell";
import { format, parseISO } from "date-fns";
import {
  Loader2,
  Search,
  ArrowLeft,
  User,
  Briefcase,
  Edit2,
  X
} from "lucide-react";

// Phase 5 (May 2026):
//   - alert()/alert() replaced with sonner toasts for consistency with the
//     rest of the AMS post-Phase-3.
//   - Sticky table header so column labels stay visible while scrolling
//     longer result lists (rare in practice — phone search returns 1-10 rows
//     — but free and matches the pattern from the other tables).
//   - 400ms debounce + reassign workflow + modal logic are preserved exactly.

export default function GlobalCustomerSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Form States
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Debounced Search Logic (unchanged: exact 10-digit phone)
  useEffect(() => {
    const cleanSearchTerm = searchTerm.trim();
    // Only trigger if it is exactly 10 digits
    const isTenDigits = /^\d{10}$/.test(cleanSearchTerm);

    const delayDebounceFn = setTimeout(async () => {
      if (isTenDigits && user) {
        setLoading(true);
        setHasSearched(true);
        try {
          const res = await axios.get(`/api/supervisor/customers/search?q=${cleanSearchTerm}`);
          setResults(res.data || []);
        } catch (error) {
          console.error("Search failed", error);
          setResults([]); // Clear on error
          toast.error("Search failed. Please try again.");
        } finally {
          setLoading(false);
        }
      } else if (cleanSearchTerm.length !== 10) {
        setResults([]);
        setHasSearched(false);
      }
    }, 400); // Slightly faster debounce since they are typing a specific number

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user]);

  // Match the status badge styling from your FollowUpPage
  const getStatusBadge = (status: string | null) => {
    if (!status) return "bg-slate-100 text-slate-400 border-slate-200";
    if (status.includes('confirmed')) return "bg-green-100 text-green-700 border-green-200";
    if (status.includes('proposed') || status.includes('fresh')) return "bg-blue-100 text-blue-700 border-blue-200";
    if (status.includes('lost')) return "bg-red-100 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const openEditModal = async (customer: any) => {
    setEditingCustomer(customer);
    setSelectedAgentId(""); // <-- Reset dropdown
    setSelectedProjectId(""); // <-- Reset dropdown
    setIsEditModalOpen(true);

    if (agents.length === 0) {
      try {
        const [agentsRes, projectsRes] = await Promise.all([
          axios.get("/api/users"),
          axios.get("/api/supervisor/summary-dashboard?section=projects")
        ]);
        setAgents(agentsRes.data.filter((u: any) => u.role === 'AGENT' && u.is_active === 1));
        setProjects(projectsRes.data);
      } catch (err) {
        console.error("Failed to load options");
        toast.error("Failed to load agents and projects.");
      }
    }
  };

  const handleSaveReassignment = async () => {
    if (!selectedAgentId || !selectedProjectId) {
      toast.error("Please select both an Agent and a Project.");
      return;
    }

    setIsSaving(true);
    try {
      await axios.put(`/api/supervisor/customers/${editingCustomer.customer_id}/reassign`, {
        new_agent_id: selectedAgentId,
        new_project_id: selectedProjectId
      });

      setIsEditModalOpen(false);
      toast.success("Customer successfully transferred.");

      // Re-trigger the search to refresh the row
      setSearchTerm(searchTerm + " "); // Preserved hack to re-trigger useEffect debounce
    } catch (error) {
      toast.error("Failed to reassign customer.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell sidebar={null}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 font-sans">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600"/>
             </button>
             <div>
                <h1 className="text-xl font-bold text-slate-900">Global Customer Search</h1>
                <p className="text-sm text-slate-500">Find any lead across the entire database</p>
             </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              maxLength={10} // Prevent typing more than 10 characters
              placeholder="Enter exact 10-digit contact number..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => {
                // Only allow numeric input
                const value = e.target.value.replace(/\D/g, "");
                setSearchTerm(value);
              }}
            />
            {loading && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              </div>
            )}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
                <span className="text-slate-400 text-sm">Searching database...</span>
             </div>
          ) : results.length === 0 ? (
             <div className="flex flex-col items-center justify-center p-20 text-slate-500">
               <Search className="w-10 h-10 mb-3 text-slate-300" />
               <p>{hasSearched && searchTerm.length > 2 ? `No customers found for "${searchTerm}"` : "Enter a name or contact number to begin searching."}</p>
             </div>
          ) : (
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3 bg-slate-50">Customer Details</th>
                    <th className="px-6 py-3 bg-slate-50">Contact</th>
                    <th className="px-6 py-3 bg-slate-50">Assignment & Project</th>
                    <th className="px-6 py-3 bg-slate-50">Current Status</th>
                    <th className="px-6 py-3 bg-slate-50">Next Follow-up</th>
                    <th className="px-6 py-3 bg-slate-50 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((item) => (
                    <tr key={item.customer_id} className="transition-colors hover:bg-slate-50 border-l-4 border-l-transparent">

                      {/* Customer Details */}
                      <td className="px-6 py-3">
                        <div className="font-semibold text-slate-900">{item.customer_name}</div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-3 font-mono text-slate-600">
                        {item.contact}
                      </td>

                      {/* Assignment & Project */}
                      <td className="px-6 py-3">
                        {item.agent_name ? (
                          <>
                            <div className="flex items-center gap-1 text-sm font-medium text-indigo-700">
                              <User className="w-3.5 h-3.5" /> {item.agent_name}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> {item.project_name || "No Project"}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3">
                         <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide border ${getStatusBadge(item.status_code)}`}>
                           {item.status_code ? item.status_code.replace(/-/g, ' ') : 'N/A'}
                         </span>
                      </td>

                      {/* Follow Up */}
                      <td className="px-6 py-3">
                        {item.follow_up_date ? (
                           <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {format(parseISO(item.follow_up_date), "dd MMM yyyy")}
                              </span>
                              {item.follow_up_time && (
                                <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                  {item.follow_up_time}
                                </span>
                              )}
                           </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* === EDIT CUSTOMER MODAL === */}
        {isEditModalOpen && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">Reassign Lead</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Customer Info Read-Only */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Customer
                  </label>
                  <div className="text-slate-900 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200 font-medium">
                    {editingCustomer.customer_name} <span className="text-slate-500 font-normal">({editingCustomer.contact})</span>
                  </div>
                </div>

                {/* Project Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assign Project
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="" disabled>-- Select Project --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Agent Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assign Agent
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                    <option value="" disabled>-- Select Agent --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.first_name} {a.last_name} (@{a.username})</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <strong>Note:</strong> Reassigning will close the current pipeline and reset the follow-up schedule so the new agent gets a clean slate.
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReassignment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  disabled={isSaving || !selectedAgentId || !selectedProjectId}
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
