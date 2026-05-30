// ----------------------------------------------------------------------------
// DateRangeFilter — reusable enterprise date-range filter control
// ----------------------------------------------------------------------------
// Renders the canonical preset dropdown and, when "Custom" is selected, the
// start/end date pickers + Apply button with inline validation. Pairs with
// useDateRangeFilter (URL-param state) but is intentionally controlled/stateless
// so it can also be driven by any other state source.
// ----------------------------------------------------------------------------
import { Calendar, Filter, Loader2 } from "lucide-react";
import {
  FILTER_OPTIONS,
  type DateFilterValue,
  validateCustomRange,
  type CustomRangeValidation,
} from "@/lib/dateRangeFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DateRangeFilterProps {
  value: DateFilterValue;
  onFilterChange: (value: DateFilterValue) => void;

  /** Draft custom inputs (only used when value === "custom"). */
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (v: string) => void;
  onEndDateChange?: (v: string) => void;
  onApply?: () => void;

  /** Optional pre-computed validation; falls back to internal check. */
  validation?: CustomRangeValidation;
  loading?: boolean;
  className?: string;
}

export function DateRangeFilter({
  value,
  onFilterChange,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  onApply,
  validation,
  loading = false,
  className,
}: DateRangeFilterProps) {
  const isCustom = value === "custom";
  const check = validation ?? validateCustomRange(startDate, endDate);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-2">
        {/* Preset dropdown */}
        <div className="relative w-full sm:w-48">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Filter className="w-4 h-4" />
          </div>
          <select
            aria-label="Date range filter"
            className="pl-9 pr-8 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground focus:ring-2 focus:ring-ring/40 focus:border-ring transition-[border-color,box-shadow,background-color] cursor-pointer hover:bg-accent/40 w-full appearance-none disabled:opacity-50"
            value={value}
            disabled={loading}
            onChange={(e) => onFilterChange(e.target.value as DateFilterValue)}
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Custom range controls — only when Custom is selected */}
        {isCustom && (
          <>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                aria-label="Start date"
                value={startDate}
                max={endDate || undefined}
                disabled={loading}
                onChange={(e) => onStartDateChange?.(e.target.value)}
                className="w-full sm:w-[150px]"
              />
              <span className="text-muted-foreground text-sm shrink-0">to</span>
              <Input
                type="date"
                aria-label="End date"
                value={endDate}
                min={startDate || undefined}
                disabled={loading}
                onChange={(e) => onEndDateChange?.(e.target.value)}
                className="w-full sm:w-[150px]"
              />
            </div>
            <Button
              type="button"
              variant="default"
              disabled={loading || !check.valid}
              onClick={onApply}
              className="w-full sm:w-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </>
        )}
      </div>

      {/* Validation message */}
      {isCustom && !check.valid && check.message && (
        <p className="text-xs text-destructive">{check.message}</p>
      )}
    </div>
  );
}

export default DateRangeFilter;
