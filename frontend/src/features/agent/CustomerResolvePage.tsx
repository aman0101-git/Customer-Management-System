import React, { useState } from "react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Types for state
export type PageState = "SEARCH" | "FOUND" | "NOT_FOUND" | "CREATE" | "EDIT";

// Dropdown options
const SOURCE_OPTIONS = ["cold-calling", "sms", "whatsapp", "website", "referral", "walk-in"];
const LEAD_RATING_OPTIONS = ["Bulls_eye", "Hot", "Warm", "Cold"];
const BUDGET_OPTIONS = ["0-50 Lakhs", "50-100 Lakhs", "1-2 Crore", "2+ Crore"];
const CONFIG_OPTIONS = ["1bhk", "2bhk", "3bhk", "4bhk", "plot", "villa"];
const PROFESSION_OPTIONS = ["business", "salaried", "professional", "retired", "other"];
const PURPOSE_OPTIONS = ["self-use", "investment", "second-home"];
const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "lost", "visit-done", "virtual-meet", "booking-done", "pending"
];

type CustomerForm = {
  name: string;
  project: string; // This stores the Project ID as a string
  location: string;
  pincode: string;
  source: string;
  leadRating: string;
  budget: string;
  config: string;
  profession: string;
  purpose: string;
  status: string;
  followUpDate: string;
  followUpTime: string;
  remark: string;
  [key: string]: string; 
};

// Helper to safe-format YYYY-MM-DD
const formatDateForInput = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function CustomerResolvePage() {
  const { user, loading } = useAuth();
  const [pageState, setPageState] = useState<PageState>("SEARCH");
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<any[]>([]);

  // 1. Load assigned projects
  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
    fetch(`${API_BASE}/api/projects`, {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        setProjects(data);
      })
      .catch(err => console.error("Failed to load projects", err));
  }, []);

  // Form state
  const [form, setForm] = useState<CustomerForm>({
    name: "",
    project: "",
    location: "",
    pincode: "",
    source: "",
    leadRating: "",
    budget: "",
    config: "",
    profession: "",
    purpose: "",
    status: "",
    followUpDate: "",
    followUpTime: "",
    remark: "",
  });

  // 2. Auto-select the last assigned project (first in list)
  useEffect(() => {
    if (pageState === "CREATE" && projects.length > 0 && !form.project) {
      setForm(prev => ({ ...prev, project: String(projects[0].id) }));
    }
  }, [projects, pageState]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return;

    try {
      setSearching(true);
      setCustomer(null);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/agent/customers/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ phone }),
        }
      );

      if (!res.ok) {
        setPageState("SEARCH");
        throw new Error("Search failed");
      }

      const data = await res.json();
      if (data.status === "FOUND") {
        setCustomer(data.data);
        setPageState("FOUND");
      } else {
        setPageState("NOT_FOUND");
      }
    } catch (err) {
      console.error("Customer search error:", err);
      setPageState("SEARCH");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      fetch(`${import.meta.env.VITE_API_URL}/api/agent/customers/${editId}`, { credentials: "include" })
        .then(res => res.json())
        .then(found => {
          if (found) {
            setCustomer(found);
            setPageState("EDIT");
            setForm({
              name: found.name || "",
              // FIX: Use project_id from backend (added in service)
              project: found.project_id ? String(found.project_id) : "",
              location: found.location || "",
              pincode: found.pincode || "",
              source: found.source || "",
              leadRating: found.rating || "",
              budget: found.budget || "",
              config: found.config || found.configuration || "",
              profession: found.profession || "",
              purpose: found.purpose || "",
              status: found.status_code || "",
              // FIX: Format Date properly for input[type='date']
              followUpDate: formatDateForInput(found.follow_up_date),
              followUpTime: found.follow_up_time || "",
              remark: found.remark || "",
            });
            // Also set phone for display if needed
            setPhone(found.phone || found.contact || "");
          }
        });
    }
  }, [searchParams]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleCancel = () => setPageState("SEARCH");

  const handleCreateOrEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Map form.project to project_id for backend
    const payload = {
      ...form,
      project_id: form.project,
      contact: phone,
      status_code: form.status,
      follow_up_date: form.followUpDate,
      follow_up_time: form.followUpTime,
    };

    try {
      if (isCreate) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/agent/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        navigate("/agent/dashboard");
      } else if (isEdit && customer) {
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/agent/customers/${customer.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload)
          }
        );
        navigate("/agent/dashboard");
      }
    } catch (err) {
      console.error("Create/Edit failed", err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Session expired</div>;

  const isCreate = pageState === "CREATE";
  const isEdit = pageState === "EDIT";

  // Derive Owner Name from Auth Context
  const ownerName = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;

  // Helper to get Project Name for "Found" view
  const getProjectName = (pid: number) => {
    const p = projects.find(proj => proj.id === pid);
    return p ? p.name : "Unknown Project";
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto py-8">
        {pageState === "SEARCH" && (
          <form onSubmit={handleSearch} className="max-w-md mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone" className="text-slate-700 font-semibold flex items-center gap-2">
                <span>Phone Number</span>
                <span className="text-xs font-normal text-slate-400">(10 digits required)</span>
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-sm">🇮🇳 +91</span>
                  </div>
                  <Input
                    id="phone"
                    className="pl-14 h-11 border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all text-lg tracking-widest"
                    placeholder="0000000000"
                    value={phone}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^\d{0,10}$/.test(val)) setPhone(val);
                    }}
                    required
                    minLength={10}
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={phone.length !== 10 || searching}
                  className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2"
                >
                  {searching ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* RESTORED AND ENHANCED FOUND UI */}
        {pageState === "FOUND" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 animate-in zoom-in-95 duration-200">
             <div className="bg-slate-50 border-b px-6 py-4 flex justify-between items-center">
               <h3 className="font-bold text-slate-800 tracking-tight">Customer Profile</h3>
               <span className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 Record Found
               </span>
             </div>

             <div className="p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                      
                      {/* Contact Info */}
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Phone Number</Label>
                        <p className="text-lg font-mono font-bold text-slate-900">{customer?.contact || "-"}</p>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Customer Name</Label>
                        <p className="text-lg font-bold text-slate-900">{customer?.name || "-"}</p>
                      </div>

                      {/* Project & Location */}
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Project</Label>
                        <p className="text-sm font-semibold text-slate-700">
                          {customer?.project_id ? getProjectName(customer.project_id) : "-"}
                        </p>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Location</Label>
                        <p className="text-sm font-semibold text-slate-700">{customer?.location || "-"}</p>
                      </div>

                      {/* Status & Follow Up */}
                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Current Status</Label>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[12px] font-bold uppercase border border-slate-200">
                           {customer?.status_code || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-2 border-b border-slate-50">
                        <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Next Follow-Up</Label>
                        <p className="text-sm font-semibold text-slate-700">
                          {formatDateForInput(customer?.follow_up_date) || "-"} <span className="text-xs text-slate-400 font-normal">{customer?.follow_up_time}</span>
                        </p>
                      </div>

                   </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <Button onClick={() => navigate(`/agent/customers/resolve?edit=${customer.id}`)} variant="outline">Edit Details</Button>
                    <Button onClick={() => navigate("/agent/dashboard")} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">Go Back</Button>
                </div>
             </div>
          </div>
        )}

        {pageState === "NOT_FOUND" && (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 mb-6 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-xl text-slate-400">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No customer found</h3>
            <p className="text-slate-500 mt-1 mb-6 text-sm">We couldn't find any records associated with this phone number.</p>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg" onClick={() => setPageState("CREATE")}>Create New Profile</Button>
          </div>
        )}

        {(isCreate || isEdit) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl mb-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <div className={`w-2 h-6 rounded-full ${isCreate ? 'bg-blue-500' : 'bg-amber-500'}`} />
                {isCreate ? "Create New Customer" : "Update Customer Details"}
              </h2>
            </div>

            <form className="p-8 space-y-10" onSubmit={handleCreateOrEdit}>
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">01</span>
                  <h3 className="font-semibold text-slate-800 uppercase text-xs tracking-widest">Lead Information</h3>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Owner Field (Read Only) */}
                  <div className="space-y-1.5 opacity-80">
                    <Label className="text-slate-600 font-medium ml-1">Owner <span className="text-rose-500">*</span></Label>
                    <Input value={ownerName} disabled className="h-11 bg-slate-50 border-slate-200 cursor-not-allowed" />
                  </div>

                  {/* Project Dropdown */}
                  <div className="space-y-1.5">
                    <Label htmlFor="form-project" className="text-slate-600 font-medium ml-1">Project <span className="text-rose-500">*</span></Label>
                    <select
                      id="form-project"
                      name="project"
                      value={form.project}
                      onChange={handleFormChange}
                      required
                      className="block w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white shadow-sm"
                    >
                      <option value="">Select project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-name" className="text-slate-600 font-medium ml-1">Customer Name <span className="text-rose-500">*</span></Label>
                    <Input id="form-name" name="name" value={form.name} onChange={handleFormChange} required className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm" />
                  </div>
                  <div className="space-y-1.5 opacity-80">
                    <Label className="text-slate-500 font-medium ml-1">Contact Number</Label>
                    <Input value={phone} disabled className="h-11 bg-slate-50 border-slate-200 font-mono tracking-wider cursor-not-allowed" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-location" className="text-slate-600 font-medium ml-1">Location <span className="text-rose-500">*</span></Label>
                    <Input id="form-location" name="location" value={form.location} onChange={handleFormChange} required className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-pincode" className="text-slate-600 font-medium ml-1">Pincode</Label>
                    <Input id="form-pincode" name="pincode" value={form.pincode} onChange={handleFormChange} className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm" />
                  </div>
                </div>
              </section>

               {/* Sections 2 & 3 */}
               <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">02</span>
                  <h3 className="font-semibold text-slate-800 uppercase text-xs tracking-widest">Preferences & Profile</h3>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { id: 'form-source', label: 'Source', name: 'source', options: SOURCE_OPTIONS, req: true },
                    { id: 'form-leadRating', label: 'Lead Rating', name: 'leadRating', options: LEAD_RATING_OPTIONS, req: true },
                    { id: 'form-budget', label: 'Budget Range', name: 'budget', options: BUDGET_OPTIONS },
                    { id: 'form-config', label: 'Configuration', name: 'config', options: CONFIG_OPTIONS },
                    { id: 'form-profession', label: 'Profession', name: 'profession', options: PROFESSION_OPTIONS },
                    { id: 'form-purpose', label: 'Purpose', name: 'purpose', options: PURPOSE_OPTIONS }
                  ].map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label htmlFor={field.id} className="text-slate-600 font-medium ml-1">
                        {field.label} {field.req && <span className="text-rose-500">*</span>}
                      </Label>
                      <select
                        id={field.id}
                        name={field.name}
                        value={form[field.name]}
                        onChange={handleFormChange}
                        required={field.req}
                        className="block w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-white shadow-sm"
                      >
                        <option value="">Select {field.label.toLowerCase()}</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">03</span>
                  <h3 className="font-semibold text-slate-800 uppercase text-xs tracking-widest">Next Action</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1.5">
                    <Label htmlFor="form-status" className="text-slate-600 font-medium ml-1">Status <span className="text-rose-500">*</span></Label>
                    <select id="form-status" name="status" value={form.status} onChange={handleFormChange} required className="block w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white">
                      <option value="">Select status</option>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-followUpDate" className="text-slate-600 font-medium ml-1">Follow-up Date</Label>
                    <Input id="form-followUpDate" name="followUpDate" type="date" value={form.followUpDate} onChange={handleFormChange} className="h-11 border-slate-200 focus:ring-4 focus:ring-blue-50 bg-white shadow-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="form-followUpTime" className="text-slate-600 font-medium ml-1">Follow-up Time</Label>
                    <Input id="form-followUpTime" name="followUpTime" type="time" value={form.followUpTime} onChange={handleFormChange} className="h-11 border-slate-200 focus:ring-4 focus:ring-blue-50 bg-white shadow-sm" />
                  </div>
                   <div className="col-span-full space-y-1.5">
                    <Label htmlFor="form-remark" className="text-slate-600 font-medium ml-1">Special Remarks</Label>
                    <textarea id="form-remark" name="remark" value={form.remark} onChange={handleFormChange} rows={3} placeholder="Enter details..." className="block w-full border border-slate-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white shadow-sm transition-all" />
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleCancel} className="px-8 h-12 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all font-semibold">Cancel</Button>
                <Button type="submit" className="px-10 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95">{isCreate ? "Confirm & Create" : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}