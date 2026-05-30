// ============================================================================
// AgentDashboard — Analytics Overview (REAL DATA, May 2026)
// ----------------------------------------------------------------------------
// Compact operational analytics for one agent. Three domains:
//   1) Customer Activity   (Created / Updated counts)
//   2) Follow-up Metrics   (Timeline bar + Status-distribution bar)
//   3) Overall Summary     (Status donut, matches SummaryDashboard sect.3)
// Plus two compact top-5 lists: Recently-Updated customers + Upcoming follow-ups.
//
// Data flow:
//   - One global time filter (Today / Yesterday / This Week / This Month /
//     Custom) maps to a {startDate, endDate} pair via presetToRange.
//   - React Query fetches /api/agent/customers/analytics ONCE per range.
//     The response holds every KPI, chart and top-list this page needs.
//   - No mock arrays, no hardcoded counts, no fake analytics.
//
// UX notes:
//   - Skeleton blocks while loading; EmptyState messages when zero rows.
//   - Section cards are click-throughs to /agent/customers, /agent/followups,
//     /agent/summary. Top-list rows navigate to the resolve page for that
//     customer so the agent can act immediately.
// ============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangeFilter } from "@/components/filters/DateRangeFilter";
import { useDateRangeFilter } from "@/hooks/useDateRangeFilter";
import { AppShell } from "@/components/ui/app-shell";
import RouteFallback from "@/components/system/RouteFallback";
import PageHeader from "@/components/system/PageHeader";
import EmptyState from "@/components/system/EmptyState";
import { formatISTDateLong } from "@/lib/formatIST";

import {
  Users,
  AlarmClock,
  ChartNoAxesCombined,
  ChevronRight,
  Phone,
  MapPin,
  Inbox,
  UserPlus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ----------------------------------------------------------------------------
// CANONICAL STATUS DICTIONARY
// ----------------------------------------------------------------------------
// Single source of truth for status display labels + chart colors. Keys are
// the real backend status_code values used across customer.service.ts,
// SummaryDashboard, FollowUpDashboard and AgentCustomersPage. We deliberately
// do NOT invent statuses (e.g. no "callback"). If the DB returns a status
// not listed here we still render it with a fallback grey color and a
// title-cased label — so the chart never silently drops a real bucket.
const STATUS_LABEL: Record<string, string> = {
  "visit-proposed":         "Visit Proposed",
  "visit-confirmed":        "Visit Confirmed",
  "visit-done":             "Visit Done",
  "virtual-meet-done":      "Virtual Meet Done",
  "virtual-meet-confirmed": "Virtual Meet Confirmed",
  "booking-done":           "Booking Done",
  "follow-up":              "Follow-up",
  "not-reachable":          "Not Reachable",
  "sdow":                   "SDOW",
  "lost":                   "Lost",
  "ringing":                "Ringing",
};

const STATUS_SHORT: Record<string, string> = {
  "visit-proposed":         "VP",
  "visit-confirmed":        "VC",
  "visit-done":             "VD",
  "virtual-meet-done":      "VMD",
  "virtual-meet-confirmed": "VMC",
  "booking-done":           "BD",
  "follow-up":              "FU",
  "not-reachable":          "NR",
  "sdow":                   "SDOW",
  "lost":                   "LOST",
  "ringing":                "RNG",
};

const STATUS_COLOR: Record<string, string> = {
  "visit-proposed":         "#f59e0b", // amber
  "visit-confirmed":        "#3b82f6", // blue
  "visit-done":             "#10b981", // emerald
  "virtual-meet-done":      "#06b6d4", // cyan
  "virtual-meet-confirmed": "#0ea5e9", // sky
  "booking-done":           "#22c55e", // green
  "follow-up":              "#8b5cf6", // violet
  "not-reachable":          "#ef4444", // red
  "sdow":                   "#f97316", // orange
  "lost":                   "#64748b", // slate
  "ringing":                "#ef4444", // red — active/urgent
};

const FALLBACK_COLOR = "#94a3b8";
const TIMELINE_COLOR = {
  overdue:  "#ef4444",
  dueToday: "#f59e0b",
  upcoming: "#3b82f6",
};

const labelFor = (code: string): string =>
  STATUS_LABEL[code] ??
  code.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
const shortFor = (code: string): string => STATUS_SHORT[code] ?? code.toUpperCase();
const colorFor = (code: string): string => STATUS_COLOR[code] ?? FALLBACK_COLOR;

// ----------------------------------------------------------------------------
// TIME-FILTER — now sourced from the shared useDateRangeFilter hook
// (frontend/src/hooks/useDateRangeFilter.ts) + DateRangeFilter component, so
// presets/custom/persistence stay consistent system-wide. The previous local
// presetToRange/iso helpers were removed in favour of that single source.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// API CONTRACT (mirrors backend response shape)
// ----------------------------------------------------------------------------
interface AnalyticsResponse {
  range: { startDate: string; endDate: string };
  customersCreated: number;
  customersUpdated: number;
  followupTimeline: { overdue: number; dueToday: number; upcoming: number };
  followupStatusDistribution: { status_code: string; count: number }[];
  summaryStatusDistribution:  { status_code: string; count: number }[];
  topCustomers: Array<{
    agent_customer_id: number;
    customer_id: number;
    status_code: string;
    updated_at: string;
    follow_up_date: string | null;
    name: string;
    contact: string;
    location: string | null;
    project_name: string | null;
  }>;
  topFollowups: Array<{
    agent_customer_id: number;
    customer_id: number;
    status_code: string;
    follow_up_date: string;
    follow_up_time: string | null;
    name: string;
    contact: string;
    location: string | null;
    project_name: string | null;
  }>;
}

async function fetchAnalytics(startDate: string, endDate: string): Promise<AnalyticsResponse> {
  const res = await axios.get<AnalyticsResponse>(
    `/api/agent/customers/analytics`,
    { params: { startDate, endDate } }
  );
  return res.data;
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function AgentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Global time filter — URL-persisted, custom range w/ Apply semantics.
  const dateFilter = useDateRangeFilter({ defaultFilter: "this-week" });
  const range = dateFilter.range;

  const analyticsQuery = useQuery({
    queryKey: ["agent", "analytics", range.startDate, range.endDate],
    queryFn: () => fetchAnalytics(range.startDate, range.endDate),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  if (authLoading || !user) return <RouteFallback />;

  const data    = analyticsQuery.data;
  const loading = analyticsQuery.isLoading || analyticsQuery.isFetching;
  const errored = analyticsQuery.isError;


  return (
    <AppShell sidebar={null}>
      {/* ===================== HEADER + GLOBAL FILTER ===================== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <PageHeader
          eyebrow="Agent Analytics Overview"
          title={`Welcome back, ${user.first_name || "Agent"}`}
          description="High-level metrics for your customers and follow-ups."
          className="mb-0"
        />

        <div className="flex items-end gap-3">
          {/* ----- CTA: Add Customer ----------------------------------------
              Brand-tokenized gradient so light + dark mode are both covered
              without bespoke palettes. The "shine" span sweeps on hover for
              the popup feel without bringing framer-motion into a button. */}
          <button
            type="button"
            onClick={() => navigate("/agent/customers/resolve")}
            className="group relative inline-flex items-center gap-2 h-9 px-4 rounded-lg overflow-hidden text-xs font-semibold text-brand-foreground bg-gradient-to-br from-brand to-brand/85 shadow-sm ring-1 ring-brand/40 transition-all duration-200 ease-out hover:shadow-lg hover:shadow-brand/30 hover:ring-brand/60 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:shadow-brand/20"
            aria-label="Add a new customer"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-4 w-1/3 -skew-x-12 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-[420%] transition-transform duration-700 ease-out"
            />
            <UserPlus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
            <span className="relative">Add Customer</span>
          </button>

          <DateRangeFilter
            value={dateFilter.filter}
            onFilterChange={dateFilter.setFilter}
            startDate={dateFilter.draftStart}
            endDate={dateFilter.draftEnd}
            onStartDateChange={dateFilter.setDraftStart}
            onEndDateChange={dateFilter.setDraftEnd}
            onApply={dateFilter.applyCustom}
            validation={dateFilter.validation}
            loading={loading}
          />
        </div>
      </div>

      {errored && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          Failed to load analytics. The page will retry automatically.
        </div>
      )}

      {/* ===================== ANALYTICS GRID ============================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ---------------- 1) CUSTOMERS ---------------- */}
        <Card
          className="lg:col-span-4 group cursor-pointer hover:shadow-md hover:border-brand/40 transition-all duration-200 flex flex-col"
          onClick={() => navigate("/agent/customers")}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                <Users className="w-4 h-4" />
              </span>
              Customer Activity
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-blue-50">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <KpiTile label="Created" value={data?.customersCreated} loading={loading} />
              <KpiTile label="Updated" value={data?.customersUpdated} loading={loading} />
            </div>
          </CardContent>
        </Card>

        {/* ---------------- 2) FOLLOW-UPS --------------- */}
        <Card
          className="lg:col-span-8 group cursor-pointer hover:shadow-md hover:border-brand/40 transition-all duration-200 flex flex-col"
          onClick={() => navigate("/agent/followups")}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <AlarmClock className="w-4 h-4" />
              </span>
              Follow-up Metrics
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-amber-50">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[200px]">
              <FollowupTimelineChart data={data?.followupTimeline} loading={loading} />
              <FollowupStatusChart   data={data?.followupStatusDistribution} loading={loading} />
            </div>
          </CardContent>
        </Card>

        {/* ---------------- 3) SUMMARY DONUT ------------ */}
        <Card
          className="lg:col-span-12 group cursor-pointer hover:shadow-md hover:border-brand/40 transition-all duration-200"
          onClick={() => navigate("/agent/summary")}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
                <ChartNoAxesCombined className="w-4 h-4" />
              </span>
              Overall System Summary
            </CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground group-hover:text-purple-600 transition-colors">View full report</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-purple-50">
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-2">
            <SummaryDonut data={data?.summaryStatusDistribution} loading={loading} />
          </CardContent>
        </Card>

        {/* ---------------- 4) TOP-5 LISTS -------------- */}
        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                <Users className="w-4 h-4" />
              </span>
              Recently Updated Customers
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate("/agent/customers")}
            >
              View all <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <TopCustomersList rows={data?.topCustomers} loading={loading} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <AlarmClock className="w-4 h-4" />
              </span>
              Upcoming Follow-ups
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate("/agent/followups")}
            >
              View all <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            <TopFollowupsList rows={data?.topFollowups} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

// ============================================================================
// PRIVATE PRESENTATIONAL HELPERS (file-local - no separate module)
// ============================================================================

function KpiTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-muted/10">
      <span className="text-sm font-medium text-muted-foreground mb-1">{label}</span>
      {loading || value === undefined ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <span className="text-3xl font-bold text-foreground tabular-nums">{value}</span>
      )}
    </div>
  );
}

const chartTooltipStyle = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  fontSize: "12px",
};

function FollowupTimelineChart({
  data,
  loading,
}: {
  data: { overdue: number; dueToday: number; upcoming: number } | undefined;
  loading: boolean;
}) {
  const chartData = useMemo(
    () =>
      data
        ? [
            { name: "Overdue",   count: data.overdue,  color: TIMELINE_COLOR.overdue  },
            { name: "Due Today", count: data.dueToday, color: TIMELINE_COLOR.dueToday },
            { name: "Upcoming",  count: data.upcoming, color: TIMELINE_COLOR.upcoming },
          ]
        : [],
    [data]
  );
  const isEmpty =
    !loading && data !== undefined &&
    data.overdue + data.dueToday + data.upcoming === 0;

  return (
    <div className="flex flex-col h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Timeline</span>
      {loading ? (
        <Skeleton className="flex-1 w-full" />
      ) : isEmpty ? (
        <MiniEmpty label="No active follow-ups" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip cursor={{ fill: "transparent" }} contentStyle={chartTooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function FollowupStatusChart({
  data,
  loading,
}: {
  data: { status_code: string; count: number }[] | undefined;
  loading: boolean;
}) {
  const chartData = useMemo(
    () =>
      (data ?? [])
        .map((d) => ({
          name:  shortFor(d.status_code),
          full:  labelFor(d.status_code),
          count: d.count,
          color: colorFor(d.status_code),
        }))
        .sort((a, b) => b.count - a.count),
    [data]
  );

  return (
    <div className="flex flex-col h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Status Distribution</span>
      {loading ? (
        <Skeleton className="flex-1 w-full" />
      ) : chartData.length === 0 ? (
        <MiniEmpty label="No follow-ups in this range" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={chartTooltipStyle}
              labelFormatter={(label, payload) =>
                payload && payload[0] ? (payload[0].payload as any).full : label
              }
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function SummaryDonut({
  data,
  loading,
}: {
  data: { status_code: string; count: number }[] | undefined;
  loading: boolean;
}) {
  const chartData = useMemo(
    () =>
      (data ?? [])
        .filter((d) => d.count > 0)
        .map((d) => ({
          name:  labelFor(d.status_code),
          code:  d.status_code,
          value: d.count,
          color: colorFor(d.status_code),
        }))
        .sort((a, b) => b.value - a.value),
    [data]
  );

  const total = chartData.reduce((acc, d) => acc + d.value, 0);

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        <Skeleton className="h-[220px] w-[220px] rounded-full" />
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 w-full md:w-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-44" />
          ))}
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No customers in this range"
        description="Try widening the time filter."
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
      <div className="relative h-[220px] w-full md:w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground tabular-nums">{total}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-3 w-full md:w-auto">
        {chartData.map((item) => (
          <div
            key={item.code}
            className="flex items-center justify-between gap-6 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
            </div>
            <span className="text-sm font-bold text-foreground tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniEmpty({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
      {label}
    </div>
  );
}

function StatusPill({ code }: { code: string }) {
  const c = colorFor(code);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${c}1A`, color: c }}
    >
      {shortFor(code)}
    </span>
  );
}

// -------------------------- Top-5 lists --------------------------

function TopCustomersList({
  rows,
  loading,
}: {
  rows: AnalyticsResponse["topCustomers"] | undefined;
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No customers updated yet"
        description="Activity in the selected period will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((r) => (
        <li key={r.agent_customer_id}>
          <button
            type="button"
            onClick={() => navigate(`/agent/customers/resolve?id=${r.agent_customer_id}`)}
            className="w-full flex items-center justify-between gap-3 py-2.5 px-1 rounded-md hover:bg-muted/40 transition-colors text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{r.name || "-"}</span>
                <StatusPill code={r.status_code} />
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" /> {r.contact || "-"}
                </span>
                {r.project_name && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" /> {r.project_name}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function TopFollowupsList({
  rows,
  loading,
}: {
  rows: AnalyticsResponse["topFollowups"] | undefined;
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon={AlarmClock}
        title="No upcoming follow-ups"
        description="You're all caught up."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((r) => (
        <li key={r.agent_customer_id}>
          <button
            type="button"
            onClick={() => navigate(`/agent/customers/resolve?id=${r.agent_customer_id}`)}
            className="w-full flex items-center justify-between gap-3 py-2.5 px-1 rounded-md hover:bg-muted/40 transition-colors text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{r.name || "-"}</span>
                <StatusPill code={r.status_code} />
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <AlarmClock className="w-3 h-3" />
                  {formatISTDateLong(r.follow_up_date)}
                  {r.follow_up_time ? ` · ${r.follow_up_time.slice(0, 5)}` : ""}
                </span>
                {r.project_name && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3" /> {r.project_name}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  );
}

