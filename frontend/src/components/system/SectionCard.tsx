// ============================================================================
// PHASE 1 — SectionCard
// ----------------------------------------------------------------------------
// Opt-in section wrapper for grouping related content on a feature page.
// Same elevation/borders as Card but with first-class title/description/
// actions slots and content padding consistent with the table primitive.
//
// Phase 2 will migrate sections (dashboards, drill-downs, lists, etc.) to use
// this so every page reads with the same hierarchy.
// ============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * If true, removes the content padding so the body can render edge-to-edge
   * (e.g. when embedding a Table). Header/actions padding is unaffected.
   */
  flush?: boolean;
}

export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ title, description, actions, flush, className, children, ...props }, ref) => {
    const hasHeader = title || description || actions;
    return (
      <section
        ref={ref}
        className={cn(
          "rounded-xl border border-border bg-card text-card-foreground shadow-elevation-1",
          className
        )}
        {...props}
      >
        {hasHeader ? (
          <header className="flex flex-col gap-2 px-5 py-4 border-b border-border md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              {title ? (
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {actions}
              </div>
            ) : null}
          </header>
        ) : null}
        <div className={cn(flush ? "" : "p-5")}>{children}</div>
      </section>
    );
  }
);
SectionCard.displayName = "SectionCard";

export default SectionCard;
