import { useState, useEffect } from "react";
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
  Edit2 
} from "lucide-react";

export default function GlobalCustomerSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced Search Logic
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Customer Details</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Assignment & Project</th>
                    <th className="px-6 py-3">Current Status</th>
                    <th className="px-6 py-3">Next Follow-up</th>
                    <th className="px-6 py-3 text-right">Actions</th>
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
                          disabled
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-md cursor-not-allowed opacity-60"
                          title="Editing coming in next update"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
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