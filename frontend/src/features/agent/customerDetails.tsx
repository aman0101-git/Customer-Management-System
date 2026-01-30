import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/apiBase";

// Professional Badge Component for Statuses
const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    "booking-done": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "visit-done": "bg-emerald-100 text-emerald-700 border-emerald-200",

    "visit-proposed": "bg-amber-100 text-amber-700 border-amber-200",
    "visit-confirmed": "bg-amber-100 text-amber-700 border-amber-200",
    "virtual-meet-confirmed": "bg-amber-100 text-amber-700 border-amber-200",
    "virtual-meet": "bg-amber-100 text-amber-700 border-amber-200",

    "pending": "bg-rose-100 text-rose-700 border-rose-200",
    "sdow": "bg-rose-100 text-rose-700 border-rose-200",
    "follow-up": "bg-rose-100 text-rose-700 border-rose-200",
    
  };

  const currentStyle = styles[status] || "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${currentStyle}`}>
      {status.replace("-", " ")}
    </span>
  );
};


export default function CustomerDetails() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Status filter bar state
  const STATUS_FILTERS = [
    "follow-up",
    "sdow",
    "virtual-meet-confirmed",
    "visit-confirmed",
    "visit-proposed",
    "not-reachable",
    "lost",
    "visit-done",
    "virtual-meet",
    "booking-done",
    "pending"
  ];
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const NON_EDITABLE_STATUSES = ["visit-done", "booking-done", "lost"];
  const COMPLETABLE_STATUSES = ["visit-done", "booking-done", "lost"];

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/agent/customers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  // Filtered customers (do not mutate original)
  const filteredCustomers = statusFilter
    ? customers.filter(c => c.status_code === statusFilter)
    : customers;

  if (loading) return <div className="p-10 text-center text-slate-500 font-medium italic">Syncing with server...</div>;
  if (error) return <div className="m-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">{error}</div>;

  const safe = (val: any) => val === null || val === undefined || val === "" ? "-" : val;

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return { d: "-", t: "" };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { d: "-", t: "" };
    
    return {
      d: d.toLocaleDateString('en-GB'), // DD/MM/YYYY
      t: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) // HH:MM
    };
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
{/* Status Filter Bar */}
<div className="px-6 py-6 bg-white border-b border-slate-100 shadow-sm space-y-4">
  {/* Row 1: All Records + First 5 Filters */}
  <div className="grid grid-cols-6 gap-3">
    {/* All Button - First Slot */}
    <button
      type="button"
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 transform hover:scale-[1.03] active:scale-95
        ${statusFilter === null
          ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200'
          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'}`}
      onClick={() => setStatusFilter(null)}
    >
      <span>All Records</span>
      <span className={`px-2 py-0.5 rounded-lg text-[10px] ${statusFilter === null ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'}`}>
        {customers.length}
      </span>
    </button>

    {/* First 5 Status Filters */}
    {STATUS_FILTERS.slice(0, 5).map(status => {
      const count = customers.filter(c => c.status_code === status).length;
      const isActive = statusFilter === status;
      
      return (
        <button
          key={status}
          type="button"
          disabled={count === 0}
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 transform hover:scale-[1.03] active:scale-95 capitalize
            ${isActive
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'}
            ${count === 0 ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
          onClick={() => count > 0 && setStatusFilter(status)}
        >
          <span className="truncate mr-2">{status.replace(/-/g, ' ')}</span>
          {count > 0 && (
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${isActive ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>

  {/* Row 2: Remaining 6 Filters */}
  <div className="grid grid-cols-6 gap-3">
    {STATUS_FILTERS.slice(5, 11).map(status => {
      const count = customers.filter(c => c.status_code === status).length;
      const isActive = statusFilter === status;
      
      return (
        <button
          key={status}
          type="button"
          disabled={count === 0}
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 transform hover:scale-[1.03] active:scale-95 capitalize
            ${isActive
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md'}
            ${count === 0 ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
          onClick={() => count > 0 && setStatusFilter(status)}
        >
          <span className="truncate mr-2">{status.replace(/-/g, ' ')}</span>
          {count > 0 && (
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${isActive ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
</div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse leading-normal">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Customer & Owner", "Contact", "Project", "Status", "Follow Up", "Assigned", "Updated", "Actions"].map((head) => (
                <th key={head} className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((c) => {
              const isCompleted = c.final_status === "COMPLETED";
              const canEdit = !NON_EDITABLE_STATUSES.includes(c.status_code) && !isCompleted;
              const canComplete = COMPLETABLE_STATUSES.includes(c.status_code) && !isCompleted;
              
              const assigned = formatDateTime(c.assigned_at);
              const updated = formatDateTime(c.updated_at);

              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  {/* Name & Owner Column */}
                  <td className="px-5 py-4">
                    <div className="text-sm font-bold text-slate-800">{safe(c.name)}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                       Owner: {safe(c.owner)}
                    </div>
                  </td>
                  
                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="text-sm font-mono text-slate-600">{safe(c.contact)}</div>
                  </td>

                  {/* Project */}
                  <td className="px-5 py-4 text-sm text-slate-500 font-medium">
                    {safe(c.project)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status_code} />
                  </td>

                  {/* Follow Up */}
                  <td className="px-5 py-4">
                    <div className="text-xs font-bold text-slate-700">{formatDateTime(c.follow_up_date).d}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{safe(c.follow_up_time)}</div>
                  </td>

                  {/* Assigned At */}
                  <td className="px-5 py-4">
                    <div className="text-xs font-semibold text-slate-600">{assigned.d}</div>
                    <div className="text-[10px] text-slate-400">{assigned.t}</div>
                  </td>

                  {/* Updated At */}
                  <td className="px-5 py-4">
                    <div className="text-xs font-semibold text-slate-600">{updated.d}</div>
                    <div className="text-[10px] text-slate-400">{updated.t}</div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/agent/customers/resolve?edit=${c.id}`)}
                          className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 font-bold text-[11px] transition-all shadow-sm"
                        >
                          Edit
                        </button>
                      )}
                      {COMPLETABLE_STATUSES.includes(c.status_code) && (
                        <button
                          disabled={!canComplete}
                          onClick={async () => {
                            if (!canComplete || !window.confirm("Mark as completed?")) return;
                            const res = await fetch(`${API_BASE}/api/agent/customers/${c.id}/complete`, {
                              method: "PATCH",
                              credentials: "include",
                            });
                            if (res.ok) loadCustomers();
                          }}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all shadow-sm
                            ${canComplete 
                              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700" 
                              : "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed"}`}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}