// ============================================================================
// AnalyticsSummaryCards
// ----------------------------------------------------------------------------
// Team-level KPI cards for the Agent Performance Matrix. Pure presentational
// component — receives the already-aggregated `summary` object from the backend
// (/api/supervisor/matrix). No data fetching, no client-side aggregation.
//
// Tokens only (text-brand / text-success / ...), matching the rest of the
// supervisor dashboard. Responsive: 2 cols on mobile → 4 → 5 on wide screens.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";

export interface MatrixSummary {
  total_leads: number;
  total_followups: number;
  total_ringing: number;
  total_visits_done: number;
  total_virtual_meetings_done: number;
  total_bookings: number;
  total_lost: number;
  active_leads: number;
  conversion_rate: number;
  completion_rate: number;
}

type Tone = "brand" | "info" | "success" | "warning" | "danger" | "violet" | "muted";

const TONE: Record<Tone, string> = {
  brand: "text-brand",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  violet: "text-chart-4",
  muted: "text-muted-foreground",
};

const BORDER: Record<Tone, string> = {
  brand: "border-brand/30",
  info: "border-info/30",
  success: "border-success/30",
  warning: "border-warning/30",
  danger: "border-danger/30",
  violet: "border-chart-4/30",
  muted: "border-border",
};

interface Props {
  summary?: MatrixSummary;
  loading?: boolean;
}

export default function AnalyticsSummaryCards({ summary, loading }: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[78px] rounded-xl" />
        ))}
      </div>
    );
  }

  const cards: Array<{ label: string; value: number; tone: Tone; suffix?: string }> = [
    { label: "Total Leads", value: summary.total_leads, tone: "brand" },
    { label: "Active Leads", value: summary.active_leads, tone: "info" },
    { label: "Follow-ups", value: summary.total_followups, tone: "info" },
    { label: "Ringing", value: summary.total_ringing, tone: "danger" },
    { label: "Visits Done", value: summary.total_visits_done, tone: "warning" },
    { label: "Virtual Meets Done", value: summary.total_virtual_meetings_done, tone: "violet" },
    { label: "Bookings", value: summary.total_bookings, tone: "success" },
    { label: "Lost", value: summary.total_lost, tone: "danger" },
    { label: "Conversion Rate", value: summary.conversion_rate, tone: "success", suffix: "%" },
    { label: "Completion Rate", value: summary.completion_rate, tone: "warning", suffix: "%" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`bg-card text-card-foreground rounded-xl border ${BORDER[c.tone]} p-3 shadow-elevation-1`}
        >
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-tight">
            {c.label}
          </h3>
          <div className="mt-2 flex items-end gap-0.5">
            <span className={`text-2xl font-bold tracking-tight tabular-nums ${TONE[c.tone]}`}>
              {c.value}
            </span>
            {c.suffix && (
              <span className={`text-sm font-semibold pb-0.5 ${TONE[c.tone]}`}>{c.suffix}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
