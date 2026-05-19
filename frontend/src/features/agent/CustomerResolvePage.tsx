import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { MessageCircle } from "lucide-react";

// Types for state
export type PageState = "SEARCH" | "FOUND" | "NOT_FOUND" | "CREATE" | "EDIT";

// Dropdown options
const SOURCE_OPTIONS = ["cold-calling", "sms", "whatsapp", "website", "referral", "walk-in"];
const LEAD_RATING_OPTIONS = ["Bulls_eye", "Hot", "Warm", "Cold"];
const BUDGET_OPTIONS = ["0-50 Lakhs", "50-100 Lakhs", "1-2 Crore", "2+ Crore"];
const CONFIG_OPTIONS = ["1bhk", "2bhk", "3bhk", "4bhk", "plot", "villa"];
const PROFESSION_OPTIONS = ["business", "salaried", "professional", "retired", "other"];
const PURPOSE_OPTIONS = ["self-use", "investment", "second-home"];
const DESIGNATION_OPTIONS = ["CXO", "Vice President", "Director", "Manager", "Team Leader", "Associate"];

const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "lost", "visit-done", "virtual-meet", "booking-done", "pending"
];

type CustomerForm = {
  name: string;
  project: string;
  location: string;
  pincode: string;
  source: string;
  leadRating: string;
  budget: string;
  config: string;
  profession: string;
  designation: string;
  purpose: string;
  status: string;
  finalStatus: string;
  followUpDate: string;
  followUpTime: string;
  doneDate: string;
  remark: string;
  [key: string]: string;
};

// Helper to safe-format YYYY-MM-DD in LOCAL time (prevents IST timezone shift)
const formatDateForInput = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

// Helper to format Date as DD/MM/YYYY for display
const formatDateDisplay = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
};

// Helper to calculate Final Status based on Status Code
const getFinalStatus = (statusCode: string) => {
  if (statusCode === "visit-done" || statusCode === "booking-done") {
    return "COMPLETED";
  }
  return "PENDING";
};

// --- NEW TAB MANAGEMENT LOGIC ---
let waWindowRef: Window | null = null;

const openInSingleWhatsAppTab = (url: string) => {
  let directUrl = url;
  if (directUrl.includes("api.whatsapp.com")) {
    directUrl = directUrl.replace("api.whatsapp.com/send", "web.whatsapp.com/send");
  }

  waWindowRef = window.open(directUrl, "AMS_WHATSAPP_TAB");
  if (waWindowRef) {
    waWindowRef.focus();
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

  // History State
  const [history, setHistory] = useState<any[]>([]);

  // Track which button was clicked
  const [submitAction, setSubmitAction] = useState<"SAVE" | "SEND">("SAVE");
  
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  const [projects, setProjects] = useState<any[]>([]);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // 1. Load assigned projects
  useEffect(() => {
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
    designation: "",
    purpose: "",
    status: "",
    finalStatus: "PENDING",
    followUpDate: "",
    followUpTime: "",
    doneDate: "",
    remark: "",
  });

  useEffect(() => {
    if (pageState === "CREATE" && projects.length === 1 && !form.project) {
      setForm(prev => ({ ...prev, project: String(projects[0].id) }));
    }
  }, [projects, pageState]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return;

    try {
      setSearching(true);
      setCustomer(null);

      const res = await fetch(`${API_BASE}/api/agent/customers/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });

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
      fetch(`${API_BASE}/api/agent/customers/${editId}`, { credentials: "include" })
        .then(res => res.json())
        .then(found => {
          if (found) {
            setCustomer(found);
            setPageState("EDIT");
            setHistory(found.history || []);

            const status = found.status_code || "";
            setForm({
              name: found.name || "",
              project: found.project_id != null ? String(found.project_id) : "",
              location: found.location || "",
              pincode: found.pincode || "",
              source: found.source || "",
              leadRating: found.rating || "",
              budget: found.budget || "",
              config: found.config || found.configuration || "",
              profession: found.profession || "",
              designation: found.designation || "",
              purpose: found.purpose || "",
              status: status,
              finalStatus: found.final_status || getFinalStatus(status),
              followUpDate: formatDateForInput(found.follow_up_date),
              followUpTime: found.follow_up_time || "",
              doneDate: formatDateForInput(found.done_date),
              remark: "",
            });
            setPhone(found.phone || found.contact || "");
          }
        });
    }
  }, [searchParams]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "status") {
      setForm(f => ({
        ...f,
        [name]: value,
        finalStatus: getFinalStatus(value),
      }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleCancel = () => {
    if (isEdit) {
      navigate("/agent/customers");
    } else {
      setPageState("SEARCH");
    }
  };

  const handleCreateOrEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWhatsappStatus({ type: "idle" });

    // Append WhatsApp tracking to remark
    let finalRemark = form.remark || "";
    if (submitAction === "SEND") {
      const statusText = form.status ? form.status.toUpperCase() : "UPDATE";
      finalRemark = finalRemark 
        ? `${finalRemark} | [WhatsApp Sent: ${statusText}]`
        : `[WhatsApp Sent: ${statusText}]`;
    }

    const payload = {
      ...form,
      remark: finalRemark,
      project_id: form.project,
      contact: phone,
      status_code: form.status,
      follow_up_date: form.followUpDate,
      follow_up_time: form.followUpTime,
      done_date: form.doneDate,
    };

    try {
      let customerIdToUse = isEdit ? customer?.customer_id : customer?.id;
      // NEW: track the agent_customer_id separately and unambiguously.
      // In EDIT mode it's customer.id (the merged endpoint exposes ac.id as `id`).
      // In CREATE mode it's populated after the POST response below.
      let agentCustomerIdToUse: number | undefined = isEdit ? customer?.id : undefined;

      if (isCreate) {
        const createRes = await fetch(`${API_BASE}/api/agent/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const createData = await createRes.json();

        if (!createRes.ok) {
          throw new Error(createData?.message || "Failed to create customer");
        }

        customerIdToUse = createData?.data?.customer_id ?? createData?.data?.id;
        agentCustomerIdToUse = createData?.data?.agent_customer_id;

        if (!customerIdToUse) {
          throw new Error("Invalid response: missing customer_id");
        }
      } else if (isEdit && agentCustomerIdToUse) {
        // BUGFIX (May 2026): PUT route is /:agentCustomerId — it expects the
        // agent_customers.id, NOT the customers.id. Previously this used
        // customerIdToUse (= customer.customer_id = c.id), which caused 403
        // Forbidden in production whenever c.id and ac.id values diverged.
        const updateRes = await fetch(`${API_BASE}/api/agent/customers/${agentCustomerIdToUse}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => null);
          throw new Error(errData?.message || `Failed to update customer (HTTP ${updateRes.status})`);
        }
      }

      // Handle sending WhatsApp Message
      if (submitAction === "SEND" && (agentCustomerIdToUse || customerIdToUse)) {
        setWhatsappSending(true);
        setWhatsappStatus({ type: "loading", message: "Preparing WhatsApp message..." });

        try {
          // Determine template code based strictly on status
          let templateCode = isCreate ? "INITIAL" : "FU"; // Default
          
          if (!isCreate && form.status) {
             const s = form.status.toUpperCase();
             if (s === "NOT-REACHABLE") templateCode = "NR";
             else if (s === "VISIT-DONE") templateCode = "VD";
             else if (s === "LOST") templateCode = "LOST";
             else if (s === "VIRTUAL-MEET") templateCode = "VM";
             else if (s === "BOOKING-DONE") templateCode = "BD";
             else if (s === "SDOW") templateCode = "SDOW";
             else if (s === "VISIT-CONFIRMED") templateCode = "VC";
             else if (s === "VISIT-PROPOSED") templateCode = "VP";
             else if (s === "VIRTUAL-MEET-CONFIRMED") templateCode = "VMC";
             else if (s === "FOLLOW-UP") templateCode = "FU";
          }

          // BUGFIX (May 2026): pass agentCustomerId (preferred) so the backend
          // does a strict ac.id lookup. customerId is included as a defensive
          // fallback only — backend prefers agentCustomerId when both are sent.
          const waRes = await fetch(`${API_BASE}/api/agent/whatsapp/send-manual`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              agentCustomerId: agentCustomerIdToUse,
              customerId: customerIdToUse,
              triggerEvent: templateCode,
            }),
          });

          const waData = await waRes.json().catch(() => null);

          if (waRes.ok) {
            if (waData?.data?.whatsappUrl) {
              openInSingleWhatsAppTab(waData.data.whatsappUrl);
            }
            setWhatsappStatus({ type: "success", message: "WhatsApp message prepared." });
          } else {
            setWhatsappStatus({
              type: "error",
              message: `WhatsApp error: ${waData?.message || "Unable to prepare message"}`,
            });
            console.warn("WhatsApp sending failed:", waData);
          }
        } catch (waErr) {
          setWhatsappStatus({ type: "error", message: "Failed to send WhatsApp message" });
          console.error("WhatsApp error:", waErr);
        } finally {
          setWhatsappSending(false);
        }
      }

      setTimeout(() => navigate("/agent/dashboard"), 500);
    } catch (err: any) {
      console.error("Error:", err);
      alert(`Error: ${err.message || "An error occurred"}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Session expired</div>;

  const isCreate = pageState === "CREATE";
  const isEdit = pageState === "EDIT";
  const ownerName = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;

  // --- LOGIC HELPERS ---
  const isDoneStatus = form.status === "visit-done" || form.status === "booking-done";
  const isLostStatus = form.status === "lost";
  const showFollowUp = !isDoneStatus && !isLostStatus;
  const showDoneDate = isDoneStatus;

  const getProjectName = () => {
    if (customer?.project_name) return customer.project_name;
    const p = projects.find(proj => proj.id === customer?.project_id);
    return p ? p.name : "-";
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Owner</Label>
                    <p className="text-sm font-bold text-slate-800 mt-1">{ownerName}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Project</Label>
                    <p className="text-sm font-bold text-slate-800 mt-1">{getProjectName()}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Customer Name</Label>
                    <p className="text-sm font-bold text-slate-800 mt-1">{customer?.name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Contact Number</Label>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-1">{customer?.contact || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Location</Label>
                    <p className="text-sm font-medium text-slate-700 mt-1">{customer?.location || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Created At</Label>
                    <p className="text-sm font-medium text-slate-700 mt-1">{formatDateDisplay(customer?.created_at) || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Current Status</Label>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-bold uppercase border border-slate-200 inline-block">
                        {customer?.status_code || "-"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Final Status</Label>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border inline-block ${
                          customer?.final_status === "COMPLETED"
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {customer?.final_status || "PENDING"}
                      </span>
                    </div>
                  </div>
                  {customer?.done_date && (
                    <div>
                      <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Done Date</Label>
                      <p className="text-sm font-semibold text-emerald-700 mt-1">{formatDateDisplay(customer.done_date)}</p>
                    </div>
                  )}
                  {!customer?.done_date && (
                    <div>
                      <Label className="text-slate-500 text-xs uppercase font-semibold tracking-wider">Next Follow-Up</Label>
                      <p className="text-sm font-semibold text-slate-700 mt-1">
                        {formatDateDisplay(customer?.follow_up_date) || "Not Set"}
                        <span className="text-xs text-slate-400 font-normal ml-2">{customer?.follow_up_time}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button onClick={() => navigate(`/agent/customers/resolve?edit=${customer.id}`)} variant="outline">
                  Edit Details
                </Button>
                <Button onClick={() => navigate("/agent/dashboard")} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                  Go Back
                </Button>
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
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg" onClick={() => setPageState("CREATE")}>
              Create New Profile
            </Button>
          </div>
        )}

        {(isCreate || isEdit) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl mb-6 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <div className={`w-2 h-6 rounded-full ${isCreate ? "bg-blue-500" : "bg-amber-500"}`} />
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
                  <div className="space-y-1.5 opacity-80">
                    <Label className="text-slate-600 font-medium ml-1">
                      Owner <span className="text-rose-500">*</span>
                    </Label>
                    <Input value={ownerName} disabled className="h-11 bg-slate-50 border-slate-200 cursor-not-allowed" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-project" className="text-slate-600 font-medium ml-1">
                      Project <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="form-project"
                      name="project"
                      value={form.project}
                      onChange={handleFormChange}
                      required
                      className="block w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white shadow-sm"
                    >
                      <option value="" disabled>Select project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-name" className="text-slate-600 font-medium ml-1">
                      Customer Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="form-name"
                      name="name"
                      value={form.name}
                      onChange={handleFormChange}
                      required
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 opacity-80">
                    <Label className="text-slate-500 font-medium ml-1">Contact Number</Label>
                    <Input value={phone} disabled className="h-11 bg-slate-50 border-slate-200 font-mono tracking-wider cursor-not-allowed" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-location" className="text-slate-600 font-medium ml-1">
                      Location <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="form-location"
                      name="location"
                      value={form.location}
                      onChange={handleFormChange}
                      required
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-pincode" className="text-slate-600 font-medium ml-1">Pincode</Label>
                    <Input
                      id="form-pincode"
                      name="pincode"
                      value={form.pincode}
                      onChange={handleFormChange}
                      className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 shadow-sm"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">02</span>
                  <h3 className="font-semibold text-slate-800 uppercase text-xs tracking-widest">Preferences & Profile</h3>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { id: "form-source", label: "Source", name: "source", options: SOURCE_OPTIONS, req: true },
                    { id: "form-leadRating", label: "Lead Rating", name: "leadRating", options: LEAD_RATING_OPTIONS, req: true },
                    { id: "form-budget", label: "Budget Range", name: "budget", options: BUDGET_OPTIONS, req: true },
                    { id: "form-config", label: "Configuration", name: "config", options: CONFIG_OPTIONS, req: true },
                    { id: "form-profession", label: "Profession", name: "profession", options: PROFESSION_OPTIONS, req: true },
                    { id: "form-purpose", label: "Purpose", name: "purpose", options: PURPOSE_OPTIONS, req: true },
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
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <Label htmlFor="form-designation" className="text-slate-600 font-medium ml-1">Designation</Label>
                    <select
                      id="form-designation"
                      name="designation"
                      value={form.designation}
                      onChange={handleFormChange}
                      className="block w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all bg-white shadow-sm"
                    >
                      <option value="">Select designation</option>
                      {DESIGNATION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">03</span>
                  <h3 className="font-semibold text-slate-800 uppercase text-xs tracking-widest">Next Action</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="form-status" className="text-slate-600 font-medium ml-1">
                      Status <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      id="form-status"
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      required
                      className="block w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select status</option>
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 opacity-90">
                    <Label htmlFor="form-finalStatus" className="text-slate-600 font-medium ml-1">Final Status</Label>
                    <Input
                      id="form-finalStatus"
                      value={form.finalStatus}
                      disabled
                      className={`h-11 border-slate-200 font-bold tracking-wide ${
                        form.finalStatus === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    />
                  </div>

                  {showFollowUp && (
                    <>
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <Label htmlFor="form-followUpDate" className="text-slate-600 font-medium ml-1">
                          Follow-up Date <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="form-followUpDate"
                          name="followUpDate"
                          type="date"
                          value={form.followUpDate}
                          onChange={handleFormChange}
                          required
                          className="h-11 border-slate-200 focus:ring-4 focus:ring-blue-50 bg-white shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <Label htmlFor="form-followUpTime" className="text-slate-600 font-medium ml-1">
                          Follow-up Time <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="form-followUpTime"
                          name="followUpTime"
                          type="time"
                          value={form.followUpTime}
                          onChange={handleFormChange}
                          required
                          className="h-11 border-slate-200 focus:ring-4 focus:ring-blue-50 bg-white shadow-sm"
                        />
                      </div>
                    </>
                  )}

                  {showDoneDate && (
                    <div className="space-y-1.5 animate-in fade-in duration-300">
                      <Label htmlFor="form-doneDate" className="text-emerald-700 font-medium ml-1">
                        Done Date <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="form-doneDate"
                        name="doneDate"
                        type="date"
                        value={form.doneDate}
                        onChange={handleFormChange}
                        required
                        className="h-11 border-emerald-200 focus:ring-4 focus:ring-emerald-50 bg-emerald-50/50 shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="bg-slate-400 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">04</span>
                  <h3 className="font-semibold text-slate-800 uppercase text-xs tracking-widest">Remarks & History</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="form-remark" className="text-slate-600 font-medium ml-1">
                      {isEdit ? "Add New Remark Update" : "Special Remarks"}
                    </Label>
                    <textarea
                      id="form-remark"
                      name="remark"
                      value={form.remark}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Enter details..."
                      className="block w-full border border-slate-200 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 bg-white shadow-sm transition-all"
                    />
                  </div>

                  {isEdit && history.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <Label className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-5 block">
                        📋 Activity History
                      </Label>
                      <div className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-inner">
                        <div className="max-h-72 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-300">
                          <div className="relative border-l-2 border-indigo-200 ml-3 space-y-6">
                            {history.map((item, idx) => (
                              <div key={idx} className="relative pl-6">
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                                  item.action_type === 'CREATE' ? 'bg-blue-500' :
                                  item.action_type === 'STATUS_CHANGE' ? 'bg-indigo-500' : 'bg-slate-400'
                                }`}></div>
                                
                                <div className="bg-white p-3.5 rounded-lg border border-slate-100 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {item.action_type === 'CREATE' && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">Lead Created</span>
                                      )}
                                      {item.action_type === 'STATUS_CHANGE' && (
                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase border border-indigo-100">Status Changed</span>
                                      )}
                                      {item.action_type === 'EDIT' && (
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase border border-slate-200">Remark Added</span>
                                      )}
                                      <span className="text-[10px] font-semibold text-slate-400">
                                        {new Date(item.date).toLocaleDateString("en-GB")} @ {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  </div>

                                  {item.action_type === 'STATUS_CHANGE' && item.old_status && item.new_status && (
                                    <div className="flex items-center gap-2 mt-2 mb-2 text-xs font-bold">
                                      <span className="text-slate-400 line-through capitalize px-2 py-0.5 bg-slate-50 rounded border border-slate-100">{item.old_status.replace(/-/g, ' ')}</span>
                                      <span className="text-slate-300">→</span>
                                      <span className="text-emerald-700 capitalize px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">{item.new_status.replace(/-/g, ' ')}</span>
                                    </div>
                                  )}

                                  {item.action_type === 'CREATE' && item.new_status && (
                                    <div className="mt-1.5 mb-2 text-xs font-bold text-blue-700 capitalize flex items-center gap-1.5">
                                      Initial Status: <span className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">{item.new_status.replace(/-/g, ' ')}</span>
                                    </div>
                                  )}

                                  {item.remark && (
                                    <div className="text-sm text-slate-700 leading-relaxed font-medium italic bg-slate-50/70 p-2.5 rounded-md border border-slate-100 mt-2">
                                      "{item.remark}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 pt-8 border-t border-slate-100 mt-8">
                {whatsappStatus.type !== "idle" && (
                  <div className={`mr-auto text-sm font-medium ${
                    whatsappStatus.type === "error" ? "text-rose-600" : "text-slate-600"
                  }`}>
                    {whatsappStatus.message}
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={whatsappSending}
                  className="px-6 h-11 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all font-semibold"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  onClick={() => setSubmitAction("SAVE")}
                  disabled={whatsappSending}
                  className="px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  {isCreate ? "Create & Save" : "Save Update"}
                </Button>
                
                <Button
                  type="submit"
                  onClick={() => setSubmitAction("SEND")}
                  disabled={whatsappSending}
                  className="px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  {whatsappSending ? (
                    <div className="animate-spin"><MessageCircle className="w-4 h-4" /></div>
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  {isCreate ? "Create & Send WA" : "Save & Send WA"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}