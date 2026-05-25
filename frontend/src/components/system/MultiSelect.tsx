// ============================================================================
// PHASE 6 — MultiSelect
// ----------------------------------------------------------------------------
// Lightweight, token-driven multi-select popover used by the supervisor
// export flow. Built on plain React + a click-outside hook — no new deps,
// no radix popover, matches existing surface tokens exactly.
//
// Semantics:
//   - selected = []   ⇒ trigger shows `allLabel` (e.g. "All Agents")
//   - selected.length === 1 ⇒ trigger shows that option's label
//   - selected.length > 1 ⇒ trigger shows "N selected"
//   - clear button appears when any selection exists
//
// Accessibility:
//   - role="button" on the trigger; arrow icon spins on open
//   - panel is keyboard reachable via Tab; Escape closes
//   - each row is a real <label> wrapping a checkbox, so click anywhere on
//     the row toggles the option
//
// Backend contract:
//   - emits string[] of selected values
//   - parent serializes via .join(",") for CSV query params (the supervisor
//     export endpoint accepts CSV or single value, see service.parseMultiFilter)
// ============================================================================

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  wrapperClassName?: string;
  panelClassName?: string;
  /** Max-height of the option list; defaults to 18rem. */
  panelMaxHeight?: string;
  id?: string;
  "aria-label"?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  allLabel = "All",
  placeholder = "Select...",
  disabled = false,
  wrapperClassName,
  panelClassName,
  panelMaxHeight = "18rem",
  id,
  "aria-label": ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Click-outside + Escape to close.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const triggerLabel =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} selected`;

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", wrapperClassName ?? "w-full")}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "h-9 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm",
          "shadow-sm transition-[border-color,box-shadow,background-color]",
          "hover:bg-accent/40",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            selected.length === 0 && "text-muted-foreground"
          )}
        >
          {triggerLabel}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={clearAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") clearAll(e as any);
              }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className={cn(
            "absolute z-50 mt-1 w-full",
            "rounded-lg border border-border bg-popover text-popover-foreground shadow-elevation-3",
            "animate-fade-in",
            panelClassName
          )}
        >
          {options.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground italic">
              No options available.
            </div>
          ) : (
            <div
              className="overflow-y-auto p-1"
              style={{ maxHeight: panelMaxHeight }}
            >
              {options.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm",
                      "transition-colors",
                      isSelected
                        ? "bg-brand/10 text-foreground"
                        : "hover:bg-accent/60 text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center rounded border shrink-0",
                        isSelected
                          ? "bg-brand border-brand text-brand-foreground"
                          : "bg-background border-input"
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      onChange={() => toggle(opt.value)}
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;
