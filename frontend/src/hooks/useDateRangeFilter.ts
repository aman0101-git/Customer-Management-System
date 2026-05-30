// ----------------------------------------------------------------------------
// useDateRangeFilter — URL-query-param-backed date range filter state
// ----------------------------------------------------------------------------
// Persistence strategy: URL query params (shareable, survives refresh, works
// with browser back/forward). State for multiple independent filters on one
// page is namespaced via `key`.
//
//   ?filter=custom&start_date=2026-05-01&end_date=2026-05-31      (key omitted)
//   ?pipeline_filter=this-week                                    (key="pipeline")
//
// Apply semantics: predefined presets commit immediately. "Custom" keeps draft
// start/end in local state and only commits to the URL (triggering a refetch)
// when applyCustom() runs — this prevents fetch-on-every-keystroke.
// ----------------------------------------------------------------------------
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_FILTER,
  type DateFilterValue,
  type DateRange,
  defaultCustomRange,
  isValidFilter,
  presetToRange,
  validateCustomRange,
  type CustomRangeValidation,
} from "@/lib/dateRangeFilter";

export interface UseDateRangeFilterOptions {
  /** Namespace for URL params when multiple filters live on one page. */
  key?: string;
  /** Initial filter when the URL carries no value. */
  defaultFilter?: DateFilterValue;
}

export interface UseDateRangeFilterResult {
  filter: DateFilterValue;
  isCustom: boolean;
  /** Committed range used for data fetching. Stable across renders. */
  range: DateRange;
  /** Draft custom inputs (uncommitted until applyCustom). */
  draftStart: string;
  draftEnd: string;
  /** Live validation for the current draft custom range. */
  validation: CustomRangeValidation;
  setFilter: (value: DateFilterValue) => void;
  setDraftStart: (v: string) => void;
  setDraftEnd: (v: string) => void;
  applyCustom: () => void;
}

export function useDateRangeFilter(
  options: UseDateRangeFilterOptions = {}
): UseDateRangeFilterResult {
  const { key, defaultFilter = DEFAULT_FILTER } = options;
  const prefix = key ? `${key}_` : "";
  const pFilter = `${prefix}filter`;
  const pStart = `${prefix}start_date`;
  const pEnd = `${prefix}end_date`;

  const [searchParams, setSearchParams] = useSearchParams();

  const rawFilter = searchParams.get(pFilter);
  const filter: DateFilterValue = isValidFilter(rawFilter) ? rawFilter : defaultFilter;

  const urlStart = searchParams.get(pStart) || undefined;
  const urlEnd = searchParams.get(pEnd) || undefined;

  // Committed range for fetching. Memoized on the primitive URL values so the
  // React Query key (or effect deps) only churns when the committed range
  // actually changes.
  const range = useMemo(
    () => presetToRange(filter, { startDate: urlStart, endDate: urlEnd }),
    [filter, urlStart, urlEnd]
  );

  // Draft inputs for the custom pickers, seeded from URL or smart defaults.
  const seed = useMemo(() => defaultCustomRange(), []);
  const [draftStart, setDraftStart] = useState<string>(urlStart || seed.startDate);
  const [draftEnd, setDraftEnd] = useState<string>(urlEnd || seed.endDate);

  const validation = useMemo(
    () => validateCustomRange(draftStart, draftEnd),
    [draftStart, draftEnd]
  );

  const commit = useCallback(
    (next: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(next)) {
            if (v === null) p.delete(k);
            else p.set(k, v);
          }
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setFilter = useCallback(
    (value: DateFilterValue) => {
      if (value === "custom") {
        // Seed draft from current committed range; don't fetch until Apply.
        const r = presetToRange(filter, { startDate: urlStart, endDate: urlEnd });
        setDraftStart(urlStart || r.startDate);
        setDraftEnd(urlEnd || r.endDate);
        commit({ [pFilter]: "custom", [pStart]: null, [pEnd]: null });
      } else {
        // Preset commits immediately; clear stale custom dates.
        commit({ [pFilter]: value, [pStart]: null, [pEnd]: null });
      }
    },
    [filter, urlStart, urlEnd, commit, pFilter, pStart, pEnd]
  );

  const applyCustom = useCallback(() => {
    if (!validateCustomRange(draftStart, draftEnd).valid) return;
    commit({ [pFilter]: "custom", [pStart]: draftStart, [pEnd]: draftEnd });
  }, [draftStart, draftEnd, commit, pFilter, pStart, pEnd]);

  return {
    filter,
    isCustom: filter === "custom",
    range,
    draftStart,
    draftEnd,
    validation,
    setFilter,
    setDraftStart,
    setDraftEnd,
    applyCustom,
  };
}
