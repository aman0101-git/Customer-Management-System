// ============================================================================
// frontend/src/components/system/ConversionFunnel.tsx
// ----------------------------------------------------------------------------
// Phase 6 (May 2026):
//   Horizontal multi-stage funnel showing absolute counts + stage-to-stage
//   conversion percentages. Stages shrink proportionally so the funnel shape
//   is read-at-a-glance.
//
//   Each stage owns a single number (count). The component computes:
//     - relative width = count / max(allCounts)
//     - conversion = stage / previous stage (% rounded)
//
//   Bars use the role color (themable via className on the parent), with a
//   slate background to make low counts still visible. No chart library.
// ============================================================================

import { useMemo } from "react";

export interface FunnelStage {
  label: string;
  count: number;
}

export interface ConversionFunnelProps {
  stages: FunnelStage[];
  className?: string;
  accentClass?: string;   // tailwind color class for bars (e.g. "bg-indigo-500")
  emptyLabel?: string;
}

export default function ConversionFunnel({
  stages,
  className = "",
  accentClass = "bg-brand",
  emptyLabel = "No data for the selected period.",
}: ConversionFunnelProps) {
  const computed = useMemo(() => {
    if (stages.length === 0) return [];
    const max = Math.max(...stages.map(s => s.count), 1);
    return stages.map((s, i) => {
      const pctWidth = (s.count / max) * 100;
      const prev = i > 0 ? stages[i - 1].count : null;
      const convPct =
        prev === null
          ? null
          : prev > 0
            ? Math.round((s.count / prev) * 100)
            : null;
      return { ...s, pctWidth, convPct };
    });
  }, [stages]);

  if (computed.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {computed.map((stage, i) => (
        <div key={stage.label} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3">
          <span className="text-xs font-semibold text-foreground truncate">
            {stage.label}
          </span>
          <div className="relative h-5 rounded-md bg-muted overflow-hidden">
            <div
              className={`${accentClass} h-full rounded-md transition-all duration-500`}
              style={{ width: `${Math.max(stage.pctWidth, stage.count > 0 ? 4 : 0)}%` }}
              aria-hidden="true"
            />
            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-bold text-foreground">
              {stage.count}
            </span>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground min-w-[3.5rem] text-right">
            {i === 0 ? "—" : stage.convPct === null ? "—" : `${stage.convPct}%`}
          </span>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground italic mt-1">
        Right-column percentages show stage-to-stage conversion vs. previous step.
      </p>
    </div>
  );
}
