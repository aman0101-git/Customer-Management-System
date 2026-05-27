// ============================================================================
// PHASE 2 + CLOSEOUT — FollowUpDashboard
// Closeout: dates rendered via formatISTDateLong for IST stability.
// ============================================================================

import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/ui/app-shell";
import {
  isBefore,
  isToday,
  startOfDay,
  differenceInCalendarDays,
} from "date-fns";
import { formatISTDateLong } from "@/lib/formatIST";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AgeDistributionBar from "@/components/system/AgeDistributionBar";
import PageHeader from "@/components/system/PageHeader";
import StatTile from "@/components/system/StatTile";
import EmptyState from "@/components/system/EmptyState";
import NativeSelect from "@/components/system/NativeSelect";
import { getOverdueInfo } from "@/lib/urgency";

const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "ringing",
];

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

  const statusFilteredData =
    selectedStatus === "all"
      ? data
      : data.filter((item) => item.status_code === selectedStatus);

  const categorized = statusFilteredData.map((item) => {
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

  const displayList = (
    filter === "all" ? categorized : categorized.filter((i) => i.category === filter)
  )
    .slice()
    .sort((a, b) => {
      const catDiff =
        (CATEGORY_ORDER[a.category as keyof typeof CATEGORY_ORDER] ?? 2) -
        (CATEGORY_ORDER[b.category as keyof typeof CATEGORY_ORDER] ?? 2);
      if (catDiff !== 0) return catDiff;
      return (
        new Date(a.follow_up_date).getTime() -
        new Date(b.follow_up_date).getTime()
      );
    });

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
      { label: "1 day", count: b1, className: "bg-warning" },
      { label: "2-3 days", count: b23, className: "bg-warning/80" },
      { label: "4-7 days", count: b47, className: "bg-danger/80" },
      { label: "8+ days (stale)", count: b8, className: "bg-danger" },
    ];
  }, [categorized]);

  const getStyles = (category: string) => {
    switch (category) {
      case "past":
        return {
          border: "border-l-danger",
          badge: "bg-danger/10 text-danger border-danger/30",
          iconBg: "bg-danger/15 text-danger",
          dateColor: "text-danger",
          label: "Overdue",
        };
      case "today":
        return {
          border: "border-l-warning",
          badge: "bg-warning/10 text-warning border-warning/30",
          iconBg: "bg-warning/15 text-warning",
          dateColor: "text-warning",
          label: "Due Today",
        };
      default:
        return {
          border: "border-l-info/70",
          badge: "bg-info/10 text-info border-info/30",
          iconBg: "bg-info/15 text-info",
          dateColor: "text-foreground",
          label: "Upcoming",
        };
    }
  };

  const StatusFilterSelect = (
    <NativeSelect
      icon={CheckCircle2}
      value={selectedStatus}
      onChange={(e) => setSelectedStatus(e.target.value)}
      wrapperClassName="min-w-[180px]"
      className="capitalize"
    >
      <option value="all">All Status</option>
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {status.replace(/-/g, " ")}
        </option>
      ))}
    </NativeSelect>
  );

  if (authLoading || loading) {
    return (
      <AppShell sidebar={null}>
        <div className="max-w-6xl mx-auto">
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
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Daily Follow-ups"
          description="Manage your pending calls and visits efficiently."
          actions={StatusFilterSelect}
        />

        {errored && (
          <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm flex items-center justify-between">
            <span>Could not load follow-ups. Showing last known data.</span>
            <button type="button" onClick={() => followupsQuery.refetch()} className="font-semibold hover:underline">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setFilter(filter === "past" ? "all" : "past")}
            className={`text-left rounded-xl transition-shadow ${filter === "past" ? "ring-2 ring-danger/40 shadow-elevation-2" : ""}`}
          >
            <StatTile label="Overdue" value={counts.past} tone="danger" icon={AlertCircle} delta={counts.past > 0 ? "Requires Immediate Action" : "All clear"} />
          </button>
          <button
            type="button"
            onClick={() => setFilter(filter === "today" ? "all" : "today")}
            className={`text-left rounded-xl transition-shadow ${filter === "today" ? "ring-2 ring-warning/40 shadow-elevation-2" : ""}`}
          >
            <StatTile label="Due Today" value={counts.today} tone="warning" icon={Clock} delta={counts.today > 0 ? "Focus here first" : "Nothing today"} />
          </button>
          <button
            type="button"
            onClick={() => setFilter(filter === "future" ? "all" : "future")}
            className={`text-left rounded-xl transition-shadow ${filter === "future" ? "ring-2 ring-info/40 shadow-elevation-2" : ""}`}
          >
            <StatTile label="Upcoming" value={counts.future} tone="info" icon={Calendar} delta={counts.future > 0 ? "Scheduled for later" : "Nothing scheduled"} />
          </button>
        </div>

        {counts.past > 0 && (
          <div className="mb-8">
            <AgeDistributionBar buckets={overdueBuckets} totalLabel="Overdue" />
          </div>
        )}

        <div className="space-y-4">
          {displayList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card">
              <EmptyState
                icon={Calendar}
                title={filter === "all" ? "No Pending Follow-ups" : `No ${filter === "past" ? "Overdue" : filter === "today" ? "Due Today" : "Upcoming"} Follow-ups`}
                description={filter === "all" ? "Great job — you've cleared your entire list." : "Nothing in this category right now."}
                action={filter !== "all" ? (
                  <Button variant="link" onClick={() => setFilter("all")} className="text-brand">
                    Show all follow-ups
                  </Button>
                ) : null}
              />
            </div>
          ) : (
            displayList.map((customer) => {
              const style = getStyles(customer.category);
              // Closeout: IST formatter — locale-independent display.
              const formattedDate = formatISTDateLong(customer.follow_up_date);
              const formattedTime = customer.follow_up_time?.slice(0, 5) || "--:--";
              const rowId: number = customer.agent_customer_id ?? customer.customer_id ?? customer.id;
              const overdueInfo = customer.category === "past" ? getOverdueInfo(customer.follow_up_date) : null;

              return (
                <div key={rowId} className={`group relative bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 hover:shadow-elevation-2 transition-shadow overflow-hidden border-l-[6px] ${style.border}`}>
                  <div className="flex flex-col md:flex-row md:items-center p-5 gap-5">
                    <div className="flex md:flex-col items-center md:items-start justify-between md:justify-center md:w-32 md:border-r md:border-border md:pr-4">
                      <div className="flex items-center gap-2 mb-0 md:mb-2">
                        <div className={`p-2 rounded-lg ${style.iconBg}`}>
                          <Calendar className="w-4 h-4" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wide md:hidden ${style.dateColor}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="text-right md:text-left">
                        <p className={`text-sm font-bold ${style.dateColor}`}>{formattedDate}</p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end md:justify-start gap-1">
                          <Clock className="w-3 h-3" /> {formattedTime}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-foreground truncate">{customer.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border uppercase font-bold tracking-wider ${style.badge}`}>
                          {style.label}
                        </span>
                        <Badge variant="outline" className="uppercase tracking-wide">
                          {customer.status_code?.replace(/-/g, " ")}
                        </Badge>
                        {overdueInfo && overdueInfo.level > 0 && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${overdueInfo.badgeClass}`}>
                            {overdueInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <a href={`tel:${customer.contact}`} className="flex items-center gap-2 hover:text-brand transition-colors group/link">
                          <Phone className="w-4 h-4 text-muted-foreground group-hover/link:text-brand" />
                          <span className="font-medium font-mono text-foreground">{customer.contact}</span>
                        </a>
                        {customer.project_name && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{customer.project_name}</span>
                          </div>
                        )}
                        {customer.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px] text-foreground">{customer.location}</span>
                          </div>
                        )}
                      </div>

                      {customer.remark && (
                        <div className="mt-3 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md border border-border line-clamp-1">
                          <span className="font-semibold text-foreground">Last Remark:</span> {customer.remark}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                      <Button onClick={() => navigate(`/agent/customers/resolve?edit=${rowId}`)} className="w-full md:w-auto gap-2 bg-success text-success-foreground hover:bg-success/90">
                        <MessageCircle className="w-4 h-4" />
                        <span>Resolve</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
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
