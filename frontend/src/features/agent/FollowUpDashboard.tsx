import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import { format, isBefore, isToday, startOfDay, differenceInCalendarDays } from "date-fns";
import {
  Phone,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  ChevronRight,
  Briefcase,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AgeDistributionBar from "@/components/system/AgeDistributionBar";
// Phase 7: shared urgency utility — consistent 4-level escalation across all follow-up views.
import { getOverdueInfo } from "@/lib/urgency";

// Phase 1 (May 2026): removed unused imports & dead WhatsApp helpers.
// Phase 2 (May 2026): migrated /api/agent/customers/followups to useQuery.
// Phase 6 (May 2026): added overdue-aging distribution bar.
// Phase 7 (May 2026): urgency chips per overdue row, sort overdue-first.

const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "virtual-meet", "pending"
];

// Sort order: overdue first (oldest first), then today, then upcoming (nearest first).
const CATEGORY_ORDER = { past: 0, today: 1, future: 2 } as const;

async function fetchFollowUps(): Promise<any[]> {
  const res = await axios.get("/api/agent/customers/followups");
  return Array.isArray(res.data) ? res.data : [];
}

export default function FollowUpDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<"all" | "past" | "today" | "future">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const followupsQuery = useQuery({
    queryKey: ["agent", "followups"],
    queryFn: fetchFollowUps,
    enabled: !!user,
    staleTime: 15_000,
  });

  const data: any[] = followupsQuery.data ?? [];
  const loading = followupsQuery.isLoading;
  const errored = followupsQuery.isError;

  const todayStart = startOfDay(new Date());

  const statusFilteredData = selectedStatus === "all"
    ? data
    : data.filter(item => item.status_code === selectedStatus);

  const categorized = statusFilteredData.map((item) => {
    const fDate = new Date(item.follow_up_date);
    const itemDateStart = startOfDay(fDate);

    let category = "future";

    if (isBefore(itemDateStart, todayStart)) {
      category = "past";
    } else if (isToday(itemDateStart)) {
      category = "today";
    }

    return { ...item, category };
  });

  const counts = {
    past: categorized.filter((i) => i.category === "past").length,
    today: categorized.filter((i) => i.category === "today").length,
    future: categorized.filter((i) => i.category === "future").length,
  };

  // Phase 7: sort overdue first (oldest = most urgent first), then today, then future (nearest first).
  // .slice() avoids mutating categorized in place.
  const displayList = (
    filter === "all" ? categorized : categorized.filter((i) => i.category === filter)
  ).slice().sort((a, b) => {
    const catDiff =
      (CATEGORY_ORDER[a.category as keyof typeof CATEGORY_ORDER] ?? 2) -
      (CATEGORY_ORDER[b.category as keyof typeof CATEGORY_ORDER] ?? 2);
    if (catDiff !== 0) return catDiff;
    // Within same category: ascending date → oldest overdue first, nearest future first.
    return new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime();
  });

  // Phase 6: overdue-aging buckets. Pure derivation over the same data.
  // Buckets:  1d  |  2-3d  |  4-7d  |  8+d (stale)
  const overdueBuckets = useMemo(() => {
    const today = startOfDay(new Date());
    let b1 = 0, b23 = 0, b47 = 0, b8 = 0;
    for (const item of categorized) {
      if (item.category !== "past") continue;
      const f = item.follow_up_date ? new Date(item.follow_up_date) : null;
      if (!f || isNaN(f.getTime())) continue;
      const daysLate = differenceInCalendarDays(today, startOfDay(f));
      if (daysLate <= 1) b1++;
      else if (daysLate <= 3) b23++;
      else if (daysLate <= 7) b47++;
      else b8++;
    }
    return [
      { label: "1 day", count: b1, className: "bg-amber-400" },
      { label: "2-3 days", count: b23, className: "bg-orange-500" },
      { label: "4-7 days", count: b47, className: "bg-rose-500" },
      { label: "8+ days (stale)", count: b8, className: "bg-red-700" },
    ];
  }, [categorized]);

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
      <AppShell sidebar={null}>
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 md:p-8 max-w-6xl mx-auto font-sans">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 max-w-6xl mx-auto font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Follow-ups</h1>
            <p className="text-slate-500 mt-1">Manage your pending calls and visits efficiently.</p>
          </div>

          <div className="relative min-w-[180px]">
            <select
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer capitalize"
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
            <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {errored && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between">
            <span>Could not load follow-ups. Showing last known data.</span>
            <button
              type="button"
              onClick={() => followupsQuery.refetch()}
              className="text-red-700 font-semibold hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
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
                <Clock className="w-6 h-6" />
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

        {/* Phase 6: overdue-aging distribution. Only renders when there
            actually are overdue items. */}
        {counts.past > 0 && (
          <div className="mb-8">
            <AgeDistributionBar buckets={overdueBuckets} totalLabel="Overdue" />
          </div>
        )}

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
              // Phase 7: urgency chip — only derived for overdue items to avoid wasted computation.
              const overdueInfo = customer.category === "past"
                ? getOverdueInfo(customer.follow_up_date)
                : null;

              return (
                <div
                  key={rowId}
                  className={`group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border-l-[6px] ${style.border}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center p-5 gap-5">
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
                        {/* Phase 7: escalation chip — shows how far overdue this item is. */}
                        {overdueInfo && overdueInfo.level > 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${overdueInfo.badgeClass}`}>
                            {overdueInfo.label}
                          </span>
                        )}
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

                    <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/agent/customers/resolve?edit=${rowId}`)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" />
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
