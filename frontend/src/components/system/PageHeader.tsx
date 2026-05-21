// ============================================================================
// PHASE 1 — PageHeader
// ----------------------------------------------------------------------------
// Opt-in presentational helper. Not yet adopted by any feature page; phase 2
// will migrate pages to use this so every screen has the same top hierarchy:
//   - eyebrow (optional small upper label)
//   - title (h1, tracking-tight)
//   - description (muted)
//   - actions slot (right side)
//
// Token-driven so it works in light and dark mode without consumer effort.
// ============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 mb-6 border-b border-border md:flex-row md:items-start md:justify-between",
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="stat-label mb-2">{eyebrow}</div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export default PageHeader;
