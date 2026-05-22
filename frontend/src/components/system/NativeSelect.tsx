// ============================================================================
// PHASE 3 — NativeSelect
// ----------------------------------------------------------------------------
// Lightweight token-driven wrapper around the native <select> element. Replaces
// the recurring "pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 ..." snippet
// that appears across SummaryDashboard, FollowUpDashboard, ExportPage,
// SupervisorSummaryDashboard, SupervisorFollowUpPage, and others.
//
// Use this where:
//   - the page uses native <select> semantics (not radix Select).
//   - an optional Lucide icon is shown inside the trigger.
//
// Do NOT replace radix Select usage (Select / SelectTrigger / SelectContent /
// SelectItem). Those remain the right primitive for richer popovers.
// ============================================================================

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon;
  /** Width applied to the wrapper div. Defaults to min-w-[160px]. */
  wrapperClassName?: string;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ icon: Icon, className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn("relative", wrapperClassName ?? "min-w-[160px]")}>
      {Icon && (
        <Icon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}
      <select
        ref={ref}
        className={cn(
          "w-full pr-8 py-2 bg-background border border-input rounded-lg",
          Icon ? "pl-9" : "pl-3",
          "text-sm font-medium text-foreground",
          "focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "cursor-pointer hover:bg-accent/40 transition-[border-color,box-shadow,background-color]",
          "appearance-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
);
NativeSelect.displayName = "NativeSelect";

export default NativeSelect;
