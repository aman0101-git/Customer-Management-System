// ============================================================================
// PHASE 1 — DashboardLayout
// ----------------------------------------------------------------------------
// NOTE: This layout is currently orphaned in the route tree — AppShell is the
// active shell wrapping every dashboard. Kept (and tokenized) for backward
// compatibility with any external references. Behavior preserved 1:1.
// ============================================================================

import type { ReactNode } from "react";
import LogoutButton from "@/features/auth/LogoutButton";

export default function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="flex items-center justify-between border-b border-border bg-card text-card-foreground px-6 py-4 shadow-elevation-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <LogoutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
