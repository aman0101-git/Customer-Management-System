// ============================================================================
// PHASE 1 — StatTile
// ----------------------------------------------------------------------------
// Compact numeric KPI tile. Replaces the ad-hoc card+number layouts currently
// rendered across the agent/supervisor dashboards. Phase 2 will adopt this so
// every dashboard reads with the same numeric hierarchy.
//
// Props:
//   - label: short uppercase label
//   - value: the headline number (string|number|node)
//   - delta: optional secondary line (e.g. "+12% vs last week")
//   - tone:  semantic accent for the icon and delta (default | success | warning | danger | info)
//   - icon:  optional Lucide icon shown on the right
// ============================================================================

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTone = "default" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<StatTone, { icon: string; delta: string }> = {
  default: {
    icon:  "bg-muted text-muted-foreground",
    delta: "text-muted-foreground",
  },
  success: {
    icon:  "bg-success/15 text-success",
    delta: "text-success",
  },
  warning: {
    icon:  "bg-warning/15 text-warning",
    delta: "text-warning",
  },
  danger: {
    icon:  "bg-danger/15 text-danger",
    delta: "text-danger",
  },
  info: {
    icon:  "bg-info/15 text-info",
    delta: "text-info",
  },
};

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  tone?: StatTone;
  icon?: LucideIcon;
}

export const StatTile = React.forwardRef<HTMLDivElement, StatTileProps>(
  ({ label, value, delta, tone = "default", icon: Icon, className, ...props }, ref) => {
    const t = TONE_CLASSES[tone];
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-start justify-between gap-4 rounded-xl border border-border bg-card text-card-foreground px-5 py-4 shadow-elevation-1 transition-shadow hover:shadow-elevation-2",
          className
        )}
        {...props}
      >
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1.5 text-foreground">{value}</p>
          {delta ? (
            <p className={cn("mt-1 text-xs font-medium", t.delta)}>{delta}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.icon)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    );
  }
);
StatTile.displayName = "StatTile";

export default StatTile;
