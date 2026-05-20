// ============================================================================
// frontend/src/components/system/RouteFallback.tsx
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Replaces the bare "<div>Loading...</div>" flash in RequireAuth while the
//   auth bootstrap (/auth/me) is in flight.
//
//   Purely visual. No data fetching, no auth coupling. Safe to reuse anywhere
//   we need a non-jarring fallback that matches the existing slate-100 shell.
// ============================================================================

export default function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 text-slate-500"
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin"
        />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}
