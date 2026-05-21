import { differenceInCalendarDays, startOfDay } from "date-fns";

/**
 * Statuses where a lead is considered "closed".
 * No urgency or idle indicators are shown for these.
 */
const INACTIVE_STATUSES = new Set([
  "visit-done",
  "booking-done",
  "lost",
  "completed",
]);

// ---------------------------------------------------------------------------
// Overdue Info
// ---------------------------------------------------------------------------

export interface OverdueInfo {
  /** 0 = not overdue. 1–4 = escalating urgency (amber → orange → rose → red). */
  level: 0 | 1 | 2 | 3 | 4;
  /** Calendar days past the follow-up date. 0 if not overdue. */
  daysLate: number;
  /** Human-readable badge label. Empty string when level === 0. */
  label: string;
  /**
   * Tailwind utility classes for an inline badge.
   * Includes bg, text, and border color.
   * Empty string when level === 0.
   */
  badgeClass: string;
}

const NONE: OverdueInfo = { level: 0, daysLate: 0, label: "", badgeClass: "" };

/**
 * Derives urgency from a follow-up date string.
 *
 * This function is intentionally date-only — it does NOT check status code.
 * Callers must skip inactive / closed leads before calling this.
 *
 * Escalation buckets (calendar days late):
 *   1 day   → level 1  amber
 *   2–3     → level 2  orange
 *   4–7     → level 3  rose
 *   8+      → level 4  red  ("Stale")
 */
export function getOverdueInfo(
  followUpDate: string | null | undefined
): OverdueInfo {
  if (!followUpDate) return NONE;

  const fDate = startOfDay(new Date(followUpDate));
  if (isNaN(fDate.getTime())) return NONE;

  const daysLate = differenceInCalendarDays(startOfDay(new Date()), fDate);
  if (daysLate <= 0) return NONE;

  if (daysLate === 1) {
    return {
      level: 1,
      daysLate,
      label: "1 day overdue",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }
  if (daysLate <= 3) {
    return {
      level: 2,
      daysLate,
      label: `${daysLate} days overdue`,
      badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
    };
  }
  if (daysLate <= 7) {
    return {
      level: 3,
      daysLate,
      label: `${daysLate} days overdue`,
      badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    };
  }
  // 8+ days — stale territory
  return {
    level: 4,
    daysLate,
    label: `Stale · ${daysLate}d`,
    badgeClass: "bg-red-100 text-red-800 border-red-400",
  };
}

// ---------------------------------------------------------------------------
// Idle / Stale days
// ---------------------------------------------------------------------------

/**
 * Returns the number of calendar days since `updatedAt` for ACTIVE leads.
 *
 * Returns 0 for:
 *   - Closed statuses (visit-done, booking-done, lost, completed)
 *   - Missing or invalid `updatedAt`
 *   - Missing `statusCode`
 *
 * Usage:
 *   const idle = getIdleDays(c.updated_at, c.status_code);
 *   if (idle >= 7) { // show "Idle Xd" chip }
 */
export function getIdleDays(
  updatedAt: string | null | undefined,
  statusCode: string | null | undefined
): number {
  if (!updatedAt || !statusCode) return 0;
  if (INACTIVE_STATUSES.has(statusCode)) return 0;

  const d = new Date(updatedAt);
  if (isNaN(d.getTime())) return 0;

  return differenceInCalendarDays(new Date(), d);
}
