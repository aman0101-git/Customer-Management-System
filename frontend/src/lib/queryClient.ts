// ============================================================================
// frontend/src/lib/queryClient.ts
// ----------------------------------------------------------------------------
// Phase 2 (May 2026):
//   Single shared QueryClient for the AMS frontend.
//
//   Conservative defaults (correctness over aggressive caching):
//     - staleTime  : 60s        (per-query overrides apply where tighter)
//     - gcTime     : 5min       (drop cache 5min after last subscriber)
//     - retry      : 1          (one quick retry for transient flakes)
//     - refetchOnWindowFocus : false  (agents alt-tab to WhatsApp constantly)
//     - refetchOnReconnect   : "always" (handle flaky office Wi-Fi)
//     - refetchOnMount       : true (default) — paired with short per-query
//                                    staleTime, this is the freshness mechanism
//
//   Per-query overrides we use (declared in each page, not here):
//     - followups       : 15s   (resolves are frequent; bound staleness)
//     - summary sections: 30s   (aggregates change slowly)
//     - projects/agents : 5min  (lookup tables, near-static)
//
//   We intentionally do NOT enable Suspense. The non-Suspense useQuery returns
//   isLoading/isError flags we render imperatively, matching the existing
//   skeleton pattern from Phase 1.
// ============================================================================

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: 0, // mutations should fail fast and surface to the caller
    },
  },
});

export default queryClient;
