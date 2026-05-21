// ============================================================================
// frontend/src/components/system/AccountabilityBadge.tsx
// ----------------------------------------------------------------------------
// Phase 8 (May 2026):
//   Lightweight operational accountability badge. Surfaces management-visible
//   signals without requiring any new backend data — all signals are derived
//   from fields already returned by existing API endpoints.
//
//   Signals:
//     "unassigned"   — active agent has zero project assignments (amber)
//     "no-followup"  — customer has no follow-up date set (slate)
//     "overdue"      — follow-up date is in the past (amber -> red via level)
//     "stale"        — no activity for 7+ days (slate)
//     "inactive"     — user account deactivated (rose)
//
//   Usage:
//     <AccountabilityBadge signal="unassigned" />
//     <AccountabilityBadge signal="overdue" label="3d overdue" level={2} />
//     <AccountabilityBadge signal="stale" label="Idle 9d" />
// ============================================================================

export type AccountabilitySignal =
  | "unassigned"
  | "no-followup"
  | "overdue"
  | "stale"
  | "inactive";

/** Urgency level — maps to escalating color. 0=amber, 1=orange, 2=rose, 3=red */
export type OverdueLevel = 0 | 1 | 2 | 3;

export interface AccountabilityBadgeProps {
  signal: AccountabilitySignal;
  /** Override the display text. Falls back to a sensible default per signal. */
  label?: string;
  /** Only relevant for "overdue" signal — controls color escalation. */
  level?: OverdueLevel;
  className?: string;
}

const SIGNAL_DEFAULTS: Record<
  AccountabilitySignal,
  { label: string; base: string }
> = {
  unassigned: {
    label: "No Projects",
    base: "bg-amber-50 text-amber-700 border-amber-300",
  },
  "no-followup": {
    label: "No Follow-up",
    base: "bg-slate-100 text-slate-500 border-slate-300",
  },
  overdue: {
    label: "Overdue",
    base: "bg-amber-50 text-amber-700 border-amber-300",
  },
  stale: {
    label: "Idle",
    base: "bg-slate-100 text-slate-500 border-slate-300",
  },
  inactive: {
    label: "Inactive",
    base: "bg-rose-50 text-rose-600 border-rose-200",
  },
};

/** Color scale for "overdue" signal, matching urgency.ts escalation */
const OVERDUE_LEVEL_CLASS: Record<OverdueLevel, string> = {
  0: "bg-amber-50 text-amber-700 border-amber-300",
  1: "bg-orange-50 text-orange-700 border-orange-300",
  2: "bg-rose-50 text-rose-600 border-rose-300",
  3: "bg-red-50 text-red-700 border-red-300",
};

export default function AccountabilityBadge({
  signal,
  label,
  level = 0,
  className = "",
}: AccountabilityBadgeProps) {
  const defaults = SIGNAL_DEFAULTS[signal];
  const displayLabel = label ?? defaults.label;

  const colorClass =
    signal === "overdue"
      ? OVERDUE_LEVEL_CLASS[level]
      : defaults.base;

  return (
    <span
      className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold tracking-wide ${colorClass} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
