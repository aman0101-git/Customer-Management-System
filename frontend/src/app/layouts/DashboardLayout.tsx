// ============================================================================
// PHASE 2 — DashboardLayout (DEPRECATED)
// ----------------------------------------------------------------------------
// DECISION (Phase 2):
//   AppShell is the formal dashboard wrapper for the AMS. It owns role-aware
//   navigation, sticky header chrome, theme toggle, mobile drawer, and the
//   container that AppRoutes wraps every authenticated page in.
//
//   DashboardLayout is kept ONLY for backward compatibility with any external
//   references (potential storybook stories, future scaffold templates, ad-hoc
//   debug routes). It is NOT referenced anywhere in src/ as of Phase 2.
//
// MIGRATION:
//   New pages → import { AppShell } from "@/components/ui/app-shell";
//   Old pages currently using <DashboardLayout> (none today) → switch to AppShell.
//
// REMOVAL:
//   Recommend full deletion in Phase 3 after confirming no external usage.
// ============================================================================

import type { ReactNode } from "react";
import LogoutButton from "@/features/auth/LogoutButton";

/**
 * @deprecated Use `AppShell` from `@/components/ui/app-shell` instead.
 *   This layout will be removed in Phase 3.
 */
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
