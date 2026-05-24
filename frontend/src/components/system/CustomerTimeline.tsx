// ============================================================================
// PHASE 6 — CustomerTimeline
// ----------------------------------------------------------------------------
// Reusable timeline renderer extracted from CustomerResolvePage. Same DOM
// shape, token-driven, so the visual is byte-equivalent to what the agent
// already sees. Used by:
//   - CustomerResolvePage    (agent edit flow, expandable history)
//   - GlobalCustomerSearch   (supervisor read-only audit view)
//
// Data contract — array of:
//   { date: string|Date, action_type: 'CREATE'|'STATUS_CHANGE'|'EDIT',
//     old_status?: string|null, new_status?: string|null, remark?: string|null }
// (Matches what /api/agent/customers/:id and /api/supervisor/customers/:id/journey return.)
// ============================================================================

import EmptyState from "@/components/system/EmptyState";
import { History } from "lucide-react";

export interface CustomerTimelineEntry {
  date: string | Date;
  action_type: "CREATE" | "STATUS_CHANGE" | "EDIT" | string;
  old_status?: string | null;
  new_status?: string | null;
  remark?: string | null;
}

export interface CustomerTimelineProps {
  history: CustomerTimelineEntry[];
  /** When true, wraps the timeline in a fixed-height scrolling container. */
  scroll?: boolean;
  /** Optional max-height (defaults 18rem) when scroll is true. */
  maxHeight?: string;
  className?: string;
}

const dotClass = (type: string) =>
  type === "CREATE"
    ? "bg-info"
    : type === "STATUS_CHANGE"
    ? "bg-brand"
    : "bg-muted-foreground";

const actionBadge = (type: string) => {
  if (type === "CREATE")
    return { text: "Lead Created",  cls: "text-info bg-info/10 border-info/30" };
  if (type === "STATUS_CHANGE")
    return { text: "Status Changed", cls: "text-brand bg-brand/10 border-brand/30" };
  return { text: "Remark Added", cls: "text-muted-foreground bg-muted border-border" };
};

export function CustomerTimeline({
  history,
  scroll = true,
  maxHeight = "18rem",
  className,
}: CustomerTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="History entries will appear here as the lead progresses."
      />
    );
  }

  const inner = (
    <div className="relative border-l-2 border-brand/30 ml-3 space-y-6">
      {history.map((item, idx) => {
        const badge = actionBadge(item.action_type);
        const dateObj = typeof item.date === "string" ? new Date(item.date) : item.date;
        const dateLabel = dateObj.toLocaleDateString("en-GB");
        const timeLabel = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        return (
          <div key={idx} className="relative pl-6">
            <div
              aria-hidden="true"
              className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center shadow-elevation-1 ${dotClass(
                item.action_type
              )}`}
            />

            <div className="bg-card p-3.5 rounded-lg border border-border shadow-elevation-1 transition-all hover:border-brand/30 hover:shadow-elevation-2">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${badge.cls}`}>
                    {badge.text}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {dateLabel} @ {timeLabel}
                  </span>
                </div>
              </div>

              {item.action_type === "STATUS_CHANGE" && item.old_status && item.new_status && (
                <div className="flex items-center gap-2 mt-2 mb-2 text-xs font-bold">
                  <span className="text-muted-foreground line-through capitalize px-2 py-0.5 bg-muted rounded border border-border">
                    {item.old_status.replace(/-/g, " ")}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-success capitalize px-2 py-0.5 bg-success/10 rounded border border-success/30">
                    {item.new_status.replace(/-/g, " ")}
                  </span>
                </div>
              )}

              {item.action_type === "CREATE" && item.new_status && (
                <div className="mt-1.5 mb-2 text-xs font-bold text-info capitalize flex items-center gap-1.5">
                  Initial Status:{" "}
                  <span className="bg-info/10 border border-info/30 px-2 py-0.5 rounded">
                    {item.new_status.replace(/-/g, " ")}
                  </span>
                </div>
              )}

              {item.remark && (
                <div className="text-sm text-foreground leading-relaxed font-medium italic bg-muted/40 p-2.5 rounded-md border border-border mt-2">
                  "{item.remark}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!scroll) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div className={`border border-border rounded-xl bg-muted/30 overflow-hidden ${className ?? ""}`}>
      <div className="overflow-y-auto p-5" style={{ maxHeight }}>
        {inner}
      </div>
    </div>
  );
}

export default CustomerTimeline;
