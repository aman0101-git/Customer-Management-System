// ============================================================================
// PHASE 1 — AuthLayout
// ----------------------------------------------------------------------------
// Tokenized surfaces, refined elevation, decorative ambient glow that only
// appears in dark mode (so it never overpowers the login card in light mode).
// Layout shape is identical to phase 0 — single centered card, max-w-md.
// ============================================================================

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background transition-colors overflow-hidden px-4">
      {/* Ambient glow — purely decorative, hidden when prefers-reduced-motion. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-100"
      >
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-brand/20 blur-3xl dark:bg-brand/30" />
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-chart-4/20 blur-3xl dark:bg-chart-4/25" />
      </div>

      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card text-card-foreground p-8 shadow-elevation-3 animate-rise-in"
      >
        {children}
      </div>
    </div>
  );
}
