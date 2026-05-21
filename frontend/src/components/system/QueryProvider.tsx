// ============================================================================
// frontend/src/components/system/QueryProvider.tsx
// ----------------------------------------------------------------------------
// Phase 2 (May 2026):
//   Mounts the shared QueryClient and installs a window-level invalidation
//   bridge so future mutation code (Phase 3+) can refresh cached read data
//   without React Query needing to know about those mutations today.
//
//   Bridge contract (additive, zero-cost today):
//     window.dispatchEvent(new CustomEvent("ams:invalidate-queries",
//       { detail: { scope?: string } }))
//
//   - No `detail`           -> invalidate ALL queries.
//   - `detail.scope = "X"`  -> invalidate every query whose queryKey starts
//                              with "X" (e.g. "agent", "supervisor",
//                              "agent.followups").
//
//   Nothing dispatches this event yet. Adding the listener now means Phase 3
//   mutations can plug in with a one-liner and dashboards refresh for free.
// ============================================================================

import { useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ scope?: string } | undefined>).detail;
      const scope = detail?.scope;

      if (!scope) {
        queryClient.invalidateQueries();
        return;
      }

      // Invalidate every query whose first key segment matches `scope`,
      // or whose dot-joined key starts with `scope`. Cheap and good-enough.
      queryClient.invalidateQueries({
        predicate: (q) => {
          const head = q.queryKey[0];
          if (typeof head !== "string") return false;
          if (head === scope) return true;
          const dotted = q.queryKey
            .filter((k) => typeof k === "string")
            .join(".");
          return dotted.startsWith(scope);
        },
      });
    };

    window.addEventListener("ams:invalidate-queries", handler);
    return () => window.removeEventListener("ams:invalidate-queries", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
