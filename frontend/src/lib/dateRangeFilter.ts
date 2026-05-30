// ----------------------------------------------------------------------------
// SHARED DATE-RANGE FILTER UTILITIES  (single source of truth)
// ----------------------------------------------------------------------------
// Every page-level date/period filter resolves a filter key -> {startDate,endDate}
// through THIS module. Replaces the previously duplicated local `presetToRange`
// (AgentDashboard) and `getDatesFromPeriod` (SummaryDashboard) implementations.
//
// Conventions preserved from the existing codebase:
//   - Dates serialized as local-time YYYY-MM-DD (date-fns `format`).
//   - Week starts Monday (`weekStartsOn: 1`) — Indian business norm.
//   - The backend already includes the FULL end day via the sargable predicate
//     `col >= startDate AND col < DATE_ADD(endDate, INTERVAL 1 DAY)`, so we only
//     ever send plain YYYY-MM-DD here — no 23:59:59 / timezone juggling needed.
// ----------------------------------------------------------------------------
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
} from "date-fns";

export type DateFilterValue =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "last-7-days"
  | "last-30-days"
  | "custom";

export interface DateRange {
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (inclusive — backend expands to full day)
}

export interface FilterOption {
  value: DateFilterValue;
  label: string;
}

/** Canonical ordered option list — drives every filter dropdown. */
export const FILTER_OPTIONS: FilterOption[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "last-30-days", label: "Last 30 Days" },
  { value: "custom", label: "Custom" },
];

const VALID_VALUES = new Set<string>(FILTER_OPTIONS.map((o) => o.value));

export const DEFAULT_FILTER: DateFilterValue = "this-week";

export const fmt = (d: Date): string => format(d, "yyyy-MM-dd");

/** Smart default custom range: last 7 days through today. */
export function defaultCustomRange(now: Date = new Date()): DateRange {
  return { startDate: fmt(subDays(now, 6)), endDate: fmt(now) };
}

/**
 * Resolve a filter key (and optional custom range) into {startDate,endDate}.
 * For "custom", falls back to a sensible last-7-days default when the caller
 * has not yet supplied a complete range.
 */
export function presetToRange(
  filter: DateFilterValue,
  custom?: Partial<DateRange>,
  now: Date = new Date()
): DateRange {
  const WK = { weekStartsOn: 1 } as const;
  switch (filter) {
    case "today":
      return { startDate: fmt(now), endDate: fmt(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { startDate: fmt(y), endDate: fmt(y) };
    }
    case "this-week":
      return { startDate: fmt(startOfWeek(now, WK)), endDate: fmt(endOfWeek(now, WK)) };
    case "last-week": {
      const p = subWeeks(now, 1);
      return { startDate: fmt(startOfWeek(p, WK)), endDate: fmt(endOfWeek(p, WK)) };
    }
    case "this-month":
      return { startDate: fmt(startOfMonth(now)), endDate: fmt(endOfMonth(now)) };
    case "last-month": {
      const p = subMonths(now, 1);
      return { startDate: fmt(startOfMonth(p)), endDate: fmt(endOfMonth(p)) };
    }
    case "last-7-days":
      return { startDate: fmt(subDays(now, 6)), endDate: fmt(now) };
    case "last-30-days":
      return { startDate: fmt(subDays(now, 29)), endDate: fmt(now) };
    case "custom": {
      const def = defaultCustomRange(now);
      return {
        startDate: custom?.startDate || def.startDate,
        endDate: custom?.endDate || def.endDate,
      };
    }
    default:
      return presetToRange(DEFAULT_FILTER, custom, now);
  }
}

export function isValidFilter(v: string | null | undefined): v is DateFilterValue {
  return !!v && VALID_VALUES.has(v);
}

export interface CustomRangeValidation {
  valid: boolean;
  message?: string;
}

/** Validate a custom range before allowing Apply / fetch. */
export function validateCustomRange(
  startDate?: string,
  endDate?: string
): CustomRangeValidation {
  if (!startDate || !endDate) {
    return { valid: false, message: "Select both a start and end date." };
  }
  if (startDate > endDate) {
    return { valid: false, message: "Start date must be on or before end date." };
  }
  return { valid: true };
}
