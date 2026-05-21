// ============================================================================
// frontend/src/components/system/AgeDistributionBar.tsx
// ----------------------------------------------------------------------------
// Phase 6 (May 2026):
//   Stacked horizontal bar showing how a set of items distributes across age
//   buckets. Used to give an agent immediate visibility into whether their
//   overdue follow-ups skew "1 day late" (recoverable) or "8+ days late"
//   (cold leads).
//
//   Designed to be read in 1 second: each bucket has its own tailwind color,
//   tooltip on hover, and a legend strip beneath. No library required.
// ============================================================================

export interface AgeBucket {
  label: string;
  count: number;
  className: string; // tailwind bg-* color
}

export interface AgeDistributionBarProps {
  buckets: AgeBucket[];
  totalLabel?: string;
  className?: string;
}

export default function AgeDistributionBar({
  buckets,
  totalLabel = "Overdue",
  className = "",
}: AgeDistributionBarProps) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  if (total === 0) return null;

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 ${className}`}>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {totalLabel} aging
        </div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {total} total
        </div>
      </div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {buckets.map((b) => {
          if (b.count === 0) return null;
          const pct = (b.count / total) * 100;
          return (
            <div
              key={b.label}
              title={`${b.label}: ${b.count} (${pct.toFixed(0)}%)`}
              className={`${b.className} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              aria-label={`${b.label}: ${b.count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-[11px]">
            <span className={`inline-block w-2 h-2 rounded-full ${b.className}`} />
            <span className="font-medium text-slate-600 dark:text-slate-300">{b.label}</span>
            <span className="text-slate-400 dark:text-slate-500">{b.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
