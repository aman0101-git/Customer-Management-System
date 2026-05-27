// ============================================================================
// PHASE 2-5 — CustomerResolvePage
// ----------------------------------------------------------------------------
// Phase 2-4: design system migration, NativeSelect adoption, button hierarchy.
// Phase 5: standardized success/error flash via sonner — replaces window.alert.
// Form logic, search/edit handlers, WhatsApp send pipeline preserved verbatim.
// ============================================================================

import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import SectionCard from "@/components/system/SectionCard";
import NativeSelect from "@/components/system/NativeSelect";
import CustomerTimeline from "@/components/system/CustomerTimeline";
import { formatISTDate } from "@/lib/formatIST";
import { celebrateVisitDone } from "@/components/system/VisitDoneCelebration";
import { MessageCircle, ArrowLeft, Search as SearchIcon, FilePlus2 } from "lucide-react";

export type PageState = "SEARCH" | "FOUND" | "NOT_FOUND" | "CREATE" | "EDIT";

const SOURCE_OPTIONS = ["cold-calling", "sms", "whatsapp", "website", "referral", "walk-in"];
const LEAD_RATING_OPTIONS = ["Bulls_eye", "Hot", "Warm", "Cold"];
const BUDGET_OPTIONS = ["0-50 Lakhs", "50-100 Lakhs", "1-2 Crore", "2+ Crore"];
const CONFIG_OPTIONS = ["1bhk", "2bhk", "3bhk", "4bhk", "plot", "villa"];
const PROFESSION_OPTIONS = ["business", "salaried", "professional", "retired", "other"];
const PURPOSE_OPTIONS = ["self-use", "investment", "second-home"];
const DESIGNATION_OPTIONS = ["CXO", "Vice President", "Director", "Manager", "Team Leader", "Associate"];

const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "lost", "visit-done", "virtual-meet-done", "booking-done", "ringing",
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

// Closeout: render in IST via the shared formatter so this read-only display
// matches everywhere else in the customer flows.
const formatDateDisplay = (dateStr: string | null | undefined) => {
  const out = formatISTDate(dateStr);
  return out === "—" ? "-" : out;
};

const getFinalStatus = (statusCode: string) => {
  if (
    statusCode === "visit-done" ||
    statusCode === "booking-done" ||
    statusCode === "virtual-meet-done"
  ) return "COMPLETED";
  return "PENDING";
};

let waWindowRef: Window | null = null;
const openInSingleWhatsAppTab = (url: string) => {
  let directUrl = url;
  if (directUrl.includes("api.whatsapp.com")) {
    directUrl = directUrl.replace("api.whatsapp.com/send", "web.whatsapp.com/send");
  }
  waWindowRef = window.open(directUrl, "AMS_WHATSAPP_TAB");
  if (waWindowRef) waWindowRef.focus();
};

const SectionNumber = ({ n, tone = "muted" }: { n: string; tone?: "muted" | "brand" }) => (
  <span
    className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider tabular-nums ${
      tone === "brand" ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"
    }`}
  >
    {n}
  </span>
);

export default function CustomerResolvePage() {
  const { user, loading } = useAuth();
  const [pageState, setPageState] = useState<PageState>("SEARCH");
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [history, setHistory] = useState<any[]>([]);
  const [submitAction, setSubmitAction] = useState<"SAVE" | "SEND">("SAVE");
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  const [projects, setProjects] = useState<any[]>([]);
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("Failed to load projects", err));
  }, []);

  const [form, setForm] = useState<CustomerForm>({
    name: "", project: "", location: "", pincode: "", source: "", leadRating: "",
    budget: "", config: "", profession: "", designation: "", purpose: "",
    status: "", finalStatus: "PENDING", followUpDate: "", followUpTime: "",
    doneDate: "", remark: "",
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

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "status") {
      setForm(f => ({ ...f, [name]: value, finalStatus: getFinalStatus(value) }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleCancel = () => {
    if (isEdit) navigate("/agent/customers");
    else setPageState("SEARCH");
  };

  const handleCreateOrEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setWhatsappStatus({ type: "idle" });

    let finalRemark = form.remark || "";
    if (submitAction === "SEND") {
      const statusText = form.status ? form.status.toUpperCase() : "UPDATE";
      finalRemark = finalRemark ? `${finalRemark} | [WhatsApp Sent: ${statusText}]` : `[WhatsApp Sent: ${statusText}]`;
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
      let agentCustomerIdToUse: number | undefined = isEdit ? customer?.id : undefined;

      if (isCreate) {
        const createRes = await fetch(`${API_BASE}/api/agent/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData?.message || "Failed to create customer");
        customerIdToUse = createData?.data?.customer_id ?? createData?.data?.id;
        agentCustomerIdToUse = createData?.data?.agent_customer_id;
        if (!customerIdToUse) throw new Error("Invalid response: missing customer_id");
      } else if (isEdit && agentCustomerIdToUse) {
        // BUGFIX (May 2026): PUT route is /:agentCustomerId — expects ac.id, not c.id.
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

      if (submitAction === "SEND" && (agentCustomerIdToUse || customerIdToUse)) {
        setWhatsappSending(true);
        setWhatsappStatus({ type: "loading", message: "Preparing WhatsApp message..." });

        try {
          let templateCode = isCreate ? "INITIAL" : "FU";
          if (!isCreate && form.status) {
            const s = form.status.toUpperCase();
            if (s === "NOT-REACHABLE") templateCode = "NR";
            else if (s === "VISIT-DONE") templateCode = "VD";
            else if (s === "LOST") templateCode = "LOST";
            else if (s === "VIRTUAL-MEET-DONE") templateCode = "VMD";
            else if (s === "BOOKING-DONE") templateCode = "BD";
            else if (s === "SDOW") templateCode = "SDOW";
            else if (s === "VISIT-CONFIRMED") templateCode = "VC";
            else if (s === "VISIT-PROPOSED") templateCode = "VP";
            else if (s === "VIRTUAL-MEET-CONFIRMED") templateCode = "VMC";
            else if (s === "RINGING") templateCode = "RNG";
            else if (s === "FOLLOW-UP") templateCode = "FU";
          }

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
            if (waData?.data?.whatsappUrl) openInSingleWhatsAppTab(waData.data.whatsappUrl);
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

      // Phase 5: success flash so the agent gets explicit confirmation before
      // the 500ms redirect kicks them back to the dashboard.
      toast.success(isCreate ? "Customer created" : "Customer updated");
      // Closeout: lightweight Visit Done / Booking Done celebration on top of
      // the regular success flash. No-op for other statuses.
      celebrateVisitDone(form.status, form.name);
      setTimeout(() => navigate("/agent/dashboard"), 500);
    } catch (err: any) {
      console.error("Error:", err);
      // Phase 5: standardized error flash via sonner (was a window.alert).
      toast.error(err.message || "An error occurred while saving");
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (!user) return <div className="p-6 text-muted-foreground">Session expired</div>;

  const isCreate = pageState === "CREATE";
  const isEdit = pageState === "EDIT";
  const ownerName = user.first_name ? `${user.first_name} ${user.last_name}` : user.username;

  const isDoneStatus =
    form.status === "visit-done" ||
    form.status === "booking-done" ||
    form.status === "virtual-meet-done";
  const isLostStatus = form.status === "lost";
  const showFollowUp = !isDoneStatus && !isLostStatus;
  const showDoneDate = isDoneStatus;

  const getProjectName = () => {
    if (customer?.project_name) return customer.project_name;
    const p = projects.find(proj => proj.id === customer?.project_id);
    return p ? p.name : "-";
  };

  return (
    <AppShell sidebar={null}>
      <div className="max-w-6xl mx-auto">
        {pageState === "SEARCH" && (
          <SectionCard
            title="Customer Lookup"
            description="Search by phone number to find an existing customer or create a new lead."
            className="max-w-2xl mx-auto"
          >
            <form onSubmit={handleSearch} className="space-y-4 animate-fade-in">
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-foreground font-semibold flex items-center gap-2">
                  <span>Phone Number</span>
                  <span className="text-xs font-normal text-muted-foreground">(10 digits required)</span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground text-sm">🇮🇳 +91</span>
                    </div>
                    <Input
                      id="phone"
                      className="pl-14 h-11 text-lg tracking-widest"
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
                    size="lg"
                    className="px-6"
                  >
                    {searching ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <SearchIcon className="w-4 h-4" />
                        <span>Search</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </SectionCard>
        )}

        {pageState === "FOUND" && (
          <SectionCard
            title="Customer Profile"
            actions={
              <span className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-success/15 text-success text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Record Found
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
              {[
                ["Owner", ownerName],
                ["Project", getProjectName()],
                ["Customer Name", customer?.name || "-"],
                ["Contact Number", customer?.contact || "-"],
                ["Location", customer?.location || "-"],
                ["Created At", formatDateDisplay(customer?.created_at) || "-"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <Label className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">{k}</Label>
                  <p className="text-sm font-semibold text-foreground mt-1">{v}</p>
                </div>
              ))}

              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Current Status</Label>
                <div className="mt-1">
                  <span className="px-2 py-0.5 bg-muted text-foreground rounded text-[11px] font-bold uppercase border border-border inline-block">
                    {customer?.status_code || "-"}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Final Status</Label>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border inline-block ${
                    customer?.final_status === "COMPLETED"
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    {customer?.final_status || "PENDING"}
                  </span>
                </div>
              </div>
              {customer?.done_date && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Done Date</Label>
                  <p className="text-sm font-semibold text-success mt-1">{formatDateDisplay(customer.done_date)}</p>
                </div>
              )}
              {!customer?.done_date && (
                <div>
                  <Label className="text-muted-foreground text-xs uppercase font-semibold tracking-wider">Next Follow-Up</Label>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {formatDateDisplay(customer?.follow_up_date) || "Not Set"}
                    <span className="text-xs text-muted-foreground font-normal ml-2">{customer?.follow_up_time}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => navigate(`/agent/customers/resolve?edit=${customer.id}`)}>
                Edit Details
              </Button>
              <Button onClick={() => navigate("/agent/dashboard")}>
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            </div>
          </SectionCard>
        )}

        {pageState === "NOT_FOUND" && (
          <SectionCard className="max-w-2xl mx-auto">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <FilePlus2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No customer found</h3>
              <p className="text-muted-foreground mt-1 mb-6 text-sm">We couldn't find any records associated with this phone number.</p>
              <Button onClick={() => setPageState("CREATE")} size="lg">
                Create New Profile
              </Button>
            </div>
          </SectionCard>
        )}

        {(isCreate || isEdit) && (
          <div className="rounded-xl border border-border bg-card text-card-foreground shadow-elevation-2 mb-6 overflow-hidden animate-rise-in">
            <div className="bg-foreground text-background px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <div className={`w-2 h-6 rounded-full ${isCreate ? "bg-info" : "bg-warning"}`} />
                {isCreate ? "Create New Customer" : "Update Customer Details"}
              </h2>
            </div>

            <form className="p-8 space-y-10" onSubmit={handleCreateOrEdit}>
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <SectionNumber n="01" />
                  <h3 className="font-semibold text-foreground uppercase text-xs tracking-widest">Lead Information</h3>
                  <div className="hairline flex-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5 opacity-80">
                    <Label className="text-muted-foreground font-medium ml-1">
                      Owner <span className="text-danger">*</span>
                    </Label>
                    <Input value={ownerName} disabled className="h-11 bg-muted cursor-not-allowed" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-project" className="text-muted-foreground font-medium ml-1">
                      Project <span className="text-danger">*</span>
                    </Label>
                    <NativeSelect
                      id="form-project"
                      name="project"
                      value={form.project}
                      onChange={handleFormChange}
                      required
                      wrapperClassName="w-full"
                      className="h-11 shadow-elevation-1"
                    >
                      <option value="" disabled>Select project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-name" className="text-muted-foreground font-medium ml-1">
                      Customer Name <span className="text-danger">*</span>
                    </Label>
                    <Input id="form-name" name="name" value={form.name} onChange={handleFormChange} required className="h-11" />
                  </div>

                  <div className="space-y-1.5 opacity-80">
                    <Label className="text-muted-foreground font-medium ml-1">Contact Number</Label>
                    <Input value={phone} disabled className="h-11 bg-muted font-mono tracking-wider cursor-not-allowed" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-location" className="text-muted-foreground font-medium ml-1">
                      Location <span className="text-danger">*</span>
                    </Label>
                    <Input id="form-location" name="location" value={form.location} onChange={handleFormChange} required className="h-11" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="form-pincode" className="text-muted-foreground font-medium ml-1">Pincode</Label>
                    <Input id="form-pincode" name="pincode" value={form.pincode} onChange={handleFormChange} className="h-11" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                  <SectionNumber n="02" />
                  <h3 className="font-semibold text-foreground uppercase text-xs tracking-widest">Preferences & Profile</h3>
                  <div className="hairline flex-1" />
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
                      <Label htmlFor={field.id} className="text-muted-foreground font-medium ml-1">
                        {field.label} {field.req && <span className="text-danger">*</span>}
                      </Label>
                      <NativeSelect
                        id={field.id}
                        name={field.name}
                        value={form[field.name]}
                        onChange={handleFormChange}
                        required={field.req}
                        wrapperClassName="w-full"
                        className="h-11 shadow-elevation-1"
                      >
                        <option value="">Select {field.label.toLowerCase()}</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </NativeSelect>
                    </div>
                  ))}

                  <div className="space-y-1.5">
                    <Label htmlFor="form-designation" className="text-muted-foreground font-medium ml-1">Designation</Label>
                    <NativeSelect
                      id="form-designation"
                      name="designation"
                      value={form.designation}
                      onChange={handleFormChange}
                      wrapperClassName="w-full"
                      className="h-11 shadow-elevation-1"
                    >
                      <option value="">Select designation</option>
                      {DESIGNATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </NativeSelect>
                  </div>
                </div>
              </section>

              <section className="bg-muted/30 p-6 rounded-xl border border-border space-y-6">
                <div className="flex items-center gap-4">
                  <SectionNumber n="03" tone="brand" />
                  <h3 className="font-semibold text-foreground uppercase text-xs tracking-widest">Next Action</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="form-status" className="text-muted-foreground font-medium ml-1">
                      Status <span className="text-danger">*</span>
                    </Label>
                    <NativeSelect
                      id="form-status"
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      required
                      wrapperClassName="w-full"
                      className="h-11"
                    >
                      <option value="">Select status</option>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5 opacity-90">
                    <Label htmlFor="form-finalStatus" className="text-muted-foreground font-medium ml-1">Final Status</Label>
                    <Input
                      id="form-finalStatus"
                      value={form.finalStatus}
                      disabled
                      className={`h-11 font-bold tracking-wide ${
                        form.finalStatus === "COMPLETED"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    />
                  </div>

                  {showFollowUp && (
                    <>
                      <div className="space-y-1.5 animate-fade-in">
                        <Label htmlFor="form-followUpDate" className="text-muted-foreground font-medium ml-1">
                          Follow-up Date <span className="text-danger">*</span>
                        </Label>
                        <Input id="form-followUpDate" name="followUpDate" type="date" value={form.followUpDate} onChange={handleFormChange} required className="h-11" />
                      </div>
                      <div className="space-y-1.5 animate-fade-in">
                        <Label htmlFor="form-followUpTime" className="text-muted-foreground font-medium ml-1">
                          Follow-up Time <span className="text-danger">*</span>
                        </Label>
                        <Input id="form-followUpTime" name="followUpTime" type="time" value={form.followUpTime} onChange={handleFormChange} required className="h-11" />
                      </div>
                    </>
                  )}

                  {showDoneDate && (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label htmlFor="form-doneDate" className="text-success font-medium ml-1">
                        Done Date <span className="text-danger">*</span>
                      </Label>
                      <Input id="form-doneDate" name="doneDate" type="date" value={form.doneDate} onChange={handleFormChange} required className="h-11 border-success/40 bg-success/5" />
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-muted/30 p-6 rounded-xl border border-border space-y-6">
                <div className="flex items-center gap-4">
                  <SectionNumber n="04" />
                  <h3 className="font-semibold text-foreground uppercase text-xs tracking-widest">Remarks & History</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="form-remark" className="text-muted-foreground font-medium ml-1">
                      {isEdit ? "Add New Remark Update" : "Special Remarks"}
                    </Label>
                    <textarea
                      id="form-remark"
                      name="remark"
                      value={form.remark}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Enter details..."
                      className="block w-full border border-input rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring bg-background text-foreground shadow-elevation-1 transition-[border-color,box-shadow]"
                    />
                  </div>

                  {isEdit && history.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-border">
                      <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest mb-5 block">
                        Activity History
                      </Label>
                      {/* Phase 6: shared timeline component — same DOM the
                          supervisor sees in GlobalCustomerSearch journey panel. */}
                      <CustomerTimeline history={history} scroll maxHeight="18rem" />
                    </div>
                  )}
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 pt-8 border-t border-border mt-8 flex-wrap">
                {whatsappStatus.type !== "idle" && (
                  <div className={`mr-auto text-sm font-medium ${
                    whatsappStatus.type === "error" ? "text-danger" : "text-muted-foreground"
                  }`}>
                    {whatsappStatus.message}
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={whatsappSending}
                  className="px-6 h-11"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  onClick={() => setSubmitAction("SAVE")}
                  disabled={whatsappSending}
                  className="px-6 h-11"
                >
                  {isCreate ? "Create & Save" : "Save Update"}
                </Button>

                <Button
                  type="submit"
                  onClick={() => setSubmitAction("SEND")}
                  disabled={whatsappSending}
                  className="px-6 h-11 bg-success text-success-foreground hover:bg-success/90"
                >
                  {whatsappSending ? (
                    <div className="animate-spin"><MessageCircle className="w-4 h-4" /></div>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Send WhatsApp</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}