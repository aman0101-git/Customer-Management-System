// ============================================================================
// frontend/src/components/ui/skeleton.tsx
// ----------------------------------------------------------------------------
// Phase 1 (May 2026):
//   shadcn-style Skeleton primitive. animate-pulse over the muted CSS-variable
//   surface so it adapts to both light and dark themes automatically.
// ============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

export default Skeleton;
