// ============================================================================
// frontend/src/components/system/RouteFallback.tsx
// ----------------------------------------------------------------------------
// Phase 0 (May 2026):
//   Replaces the bare "<div>Loading...</div>" flash in RequireAuth while the
//   auth bootstrap (/auth/me) is in flight.
//
// Phase 1 (May 2026):
//   Tokenized so it matches dark and light mode automatically. Spinner head
//   uses the brand token for design-system consistency.
// ============================================================================

export default function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 text-muted-foreground"
      >
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border-2 border-border border-t-brand animate-spin"
        />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    </div>
  );
}
