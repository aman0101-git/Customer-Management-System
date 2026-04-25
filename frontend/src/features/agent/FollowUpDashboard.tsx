import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/ui/app-shell";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import {
  Loader2,
  Phone,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Clock3,
  RefreshCw,
  ChevronRight,
  Briefcase,
  MessageCircle,
} from "lucide-react";

// --- NEW TAB MANAGEMENT LOGIC ---
// Defined outside the component so the reference persists across React re-renders
let waWindowRef: Window | null = null;

const openInSingleWhatsAppTab = (url: string) => {
  // Convert api.whatsapp.com to web.whatsapp.com to prevent domain redirects
  // from detaching the window reference in modern browsers.
  let directUrl = url;
  if (directUrl.includes("api.whatsapp.com")) {
    directUrl = directUrl.replace("api.whatsapp.com/send", "web.whatsapp.com/send");
  }

  // Open or update the exact same tab
  waWindowRef = window.open(directUrl, "AMS_WHATSAPP_TAB");

  // Bring the tab into focus for the agent
  if (waWindowRef) {
    waWindowRef.focus();
  }
};

export default function FollowUpDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "past" | "today" | "future">("all");
  const [loading, setLoading] = useState(true);
  const [whatsappLoading, setWhatsappLoading] = useState<number | null>(null);
  const [eventSelectionOpen, setEventSelectionOpen] = useState<number | null>(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (user) fetchFollowUps();
  }, [user]);

  const fetchFollowUps = async () => {
    try {
      const res = await axios.get("/api/agent/customers/followups");
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch followups", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setEventSelectionOpen(null);
    };

    if (eventSelectionOpen !== null) {
      window.addEventListener("click", handleClickOutside);
    }

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [eventSelectionOpen]);

  // WhatsApp Handler (Phase 2)
  const handleSendWhatsApp = async (customerId: number, triggerEvent: string = "REMINDER_D3") => {
    if (!customerId) return;

    setWhatsappLoading(customerId);
    try {
      const response = await axios.post("/api/agent/whatsapp/send-manual", {
        customerId,
        triggerEvent,
      });

      if (response.data?.data?.whatsappUrl) {
        // --- APPLIED FIX ---
        openInSingleWhatsAppTab(response.data.data.whatsappUrl);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || "Failed to send WhatsApp";
      alert(`Error: ${message}`);
      console.error("WhatsApp error:", error);
    } finally {
      setWhatsappLoading(null);
    }
  };

  // --- CATEGORIZATION LOGIC ---
  const todayStart = startOfDay(new Date());

  const categorized = data.map((item) => {
    const fDate = new Date(item.follow_up_date);
    const itemDateStart = startOfDay(fDate);

    let category = "future";
    if (isBefore(itemDateStart, todayStart)) category = "past";
    else if (isToday(itemDateStart)) category = "today";

    return { ...item, category };
  });

  const counts = {
    past: categorized.filter((i) => i.category === "past").length,
    today: categorized.filter((i) => i.category === "today").length,
    future: categorized.filter((i) => i.category === "future").length,
  };

  // --- FILTERING ---
  const displayList =
    filter === "all" ? categorized : categorized.filter((i) => i.category === filter);

  // --- STYLE HELPER ---
  const getStyles = (category: string) => {
    switch (category) {
      case "past":
        return {
          border: "border-l-red-500",
          badge: "bg-red-50 text-red-700 border-red-200",
          iconBg: "bg-red-100 text-red-600",
          dateColor: "text-red-600",
          label: "Overdue",
        };
      case "today":
        return {
          border: "border-l-orange-500",
          badge: "bg-orange-50 text-orange-700 border-orange-200",
          iconBg: "bg-orange-100 text-orange-600",
          dateColor: "text-orange-600",
          label: "Due Today",
        };
      default:
        return {
          border: "border-l-yellow-400",
          badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
          iconBg: "bg-yellow-100 text-yellow-600",
          dateColor: "text-slate-600",
          label: "Upcoming",
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 max-w-6xl mx-auto font-sans">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Follow-ups</h1>
            <p className="text-slate-500 mt-1">Manage your pending calls and visits efficiently.</p>
          </div>
          <button
            onClick={() => fetchFollowUps()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 px-4 py-2 rounded-lg shadow-sm transition-all text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh List</span>
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div
            onClick={() => setFilter(filter === "past" ? "all" : "past")}
            className={`cursor-pointer relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group ${
              filter === "past"
                ? "bg-white border-red-200 shadow-md ring-2 ring-red-100"
                : "bg-white border-slate-200 shadow-sm hover:border-red-200 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Overdue
                </p>
                <h3
                  className={`text-4xl font-bold mt-2 ${
                    filter === "past" ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {counts.past}
                </h3>
              </div>
              <div
                className={`p-3 rounded-xl ${
                  filter === "past"
                    ? "bg-red-100 text-red-600"
                    : "bg-slate-50 text-slate-400 group-hover:bg-red-50 group-hover:text-red-500"
                }`}
              >
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-xs font-medium text-red-500 bg-red-50 inline-block px-2 py-1 rounded">
              Requires Immediate Action
            </div>
          </div>

          <div
            onClick={() => setFilter(filter === "today" ? "all" : "today")}
            className={`cursor-pointer relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group ${
              filter === "today"
                ? "bg-white border-orange-200 shadow-md ring-2 ring-orange-100"
                : "bg-white border-slate-200 shadow-sm hover:border-orange-200 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Due Today
                </p>
                <h3
                  className={`text-4xl font-bold mt-2 ${
                    filter === "today" ? "text-orange-600" : "text-slate-800"
                  }`}
                >
                  {counts.today}
                </h3>
              </div>
              <div
                className={`p-3 rounded-xl ${
                  filter === "today"
                    ? "bg-orange-100 text-orange-600"
                    : "bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500"
                }`}
              >
                <Clock3 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-xs font-medium text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded">
              Focus here first
            </div>
          </div>

          <div
            onClick={() => setFilter(filter === "future" ? "all" : "future")}
            className={`cursor-pointer relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 group ${
              filter === "future"
                ? "bg-white border-yellow-200 shadow-md ring-2 ring-yellow-100"
                : "bg-white border-slate-200 shadow-sm hover:border-yellow-200 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Upcoming
                </p>
                <h3
                  className={`text-4xl font-bold mt-2 ${
                    filter === "future" ? "text-yellow-600" : "text-slate-800"
                  }`}
                >
                  {counts.future}
                </h3>
              </div>
              <div
                className={`p-3 rounded-xl ${
                  filter === "future"
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-slate-50 text-slate-400 group-hover:bg-yellow-50 group-hover:text-yellow-500"
                }`}
              >
                <Calendar className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-xs font-medium text-yellow-700 bg-yellow-50 inline-block px-2 py-1 rounded">
              Scheduled for later
            </div>
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="space-y-4">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Pending Follow-ups</h3>
              <p className="text-slate-500 text-sm">
                Great job! You have cleared your list for this category.
              </p>
            </div>
          ) : (
            displayList.map((customer) => {
              const style = getStyles(customer.category);
              const formattedDate = format(new Date(customer.follow_up_date), "dd MMM yyyy");
              const formattedTime = customer.follow_up_time?.slice(0, 5) || "--:--";

              const rowId: number = customer.agent_customer_id ?? customer.customer_id ?? customer.id;
              const sendCustomerId: number = customer.customer_id ?? customer.id ?? rowId;

              return (
                <div
                  key={rowId}
                  className={`group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-[6px] ${style.border}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center p-5 gap-5">
                    {/* Left: Status Icon & Date */}
                    <div className="flex md:flex-col items-center md:items-start justify-between md:justify-center md:w-32 md:border-r md:border-slate-100 md:pr-4">
                      <div className="flex items-center gap-2 mb-0 md:mb-2">
                        <div className={`p-2 rounded-lg ${style.iconBg}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-xs font-bold uppercase tracking-wide md:hidden ${style.dateColor}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <div className="text-right md:text-left">
                        <p className={`text-sm font-bold ${style.dateColor}`}>{formattedDate}</p>
                        <p className="text-xs text-slate-400 flex items-center justify-end md:justify-start gap-1">
                          <Clock className="w-3 h-3" /> {formattedTime}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Customer Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900 truncate">
                          {customer.name}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border uppercase font-bold tracking-wider ${style.badge}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 uppercase font-semibold">
                          {customer.status_code?.replace(/-/g, " ")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                        <a
                          href={`tel:${customer.contact}`}
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors group/link"
                        >
                          <Phone className="w-4 h-4 text-slate-400 group-hover/link:text-blue-500" />
                          <span className="font-medium font-mono">{customer.contact}</span>
                        </a>

                        {customer.project_name && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            <span>{customer.project_name}</span>
                          </div>
                        )}

                        {customer.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="truncate max-w-[150px]">{customer.location}</span>
                          </div>
                        )}
                      </div>

                      {customer.remark && (
                        <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-100 line-clamp-1">
                          <span className="font-semibold text-slate-600">Last Remark:</span>{" "}
                          {customer.remark}
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                      <div className="flex flex-col items-end gap-2 relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventSelectionOpen(eventSelectionOpen === rowId ? null : rowId);
                          }}
                          disabled={whatsappLoading === rowId}
                          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95"
                        >
                          {whatsappLoading === rowId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">
                            {whatsappLoading === rowId ? "Sending..." : "WhatsApp"}
                          </span>
                        </button>

                        {eventSelectionOpen === rowId && (
                          <div
                            className="flex gap-2 flex-wrap justify-end bg-white border border-slate-200 rounded-lg p-2 shadow-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {[
                              { value: "CHAT", label: "Open Chat" },
                              { value: "REMINDER_D3", label: "Reminder D-3" },
                              { value: "REMINDER_D1", label: "Reminder D-1" },
                              { value: "FOLLOWUP_DAY", label: "Follow-up Day" },
                            ].map((event) => (
                              <button
                                key={event.value}
                                type="button"
                                onClick={() => {
                                  if (event.value === "CHAT") {
                                    const phone = customer.contact || customer.phone;

                                    if (!phone) {
                                      alert("Phone number not available");
                                      return;
                                    }

                                    const digits = phone.replace(/\D/g, "");
                                    const formatted = digits.length === 10 ? "91" + digits : digits;

                                    // --- APPLIED FIX ---
                                    // Bypass api.whatsapp redirect by hitting the web portal directly
                                    const waUrl = `https://web.whatsapp.com/send?phone=${formatted}`;
                                    openInSingleWhatsAppTab(waUrl);
                                  } else {
                                    handleSendWhatsApp(sendCustomerId, event.value);
                                  }

                                  setEventSelectionOpen(null);
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              >
                                {event.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/agent/customers/resolve?edit=${rowId}`)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95"
                      >
                        <span>Resolve</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}