// ============================================================================
// PHASE 1 — AppShell
// ----------------------------------------------------------------------------
// Modernized navigation chrome.
//
// Preserved (backward compatible):
//   - Role-aware navigation arrays (agentNav, supervisorNav, adminNav) — same
//     items, same routes, same order. Pages depend on the role color cues
//     (agent=indigo, supervisor=violet, admin=rose) so those remain but are
//     mapped through tokens / consistent hue families.
//   - <AppShell sidebar={...}>{children}</AppShell> contract.
//   - LogoutButton-style logout action wired to useAuth().logout.
//   - Theme toggle slot.
//
// Refinements:
//   - Replaced inline `bg-[#f8fafc]` with `bg-background` so dark mode works
//     without conditional classes scattered everywhere.
//   - Sidebar uses the new --sidebar token family.
//   - Header is a real sticky surface (bg-card/85 + backdrop-blur) with a
//     hairline border that reads correctly in both modes.
//   - Active nav pill uses brand+accent tinting so the role color reads as
//     accent, not background — quieter, more enterprise.
//   - Mobile menu trigger kept as a placeholder; real drawer slated for phase 2.
// ============================================================================

import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/system/ThemeToggle";
import {
  LogOut,
  LayoutDashboard,
  Search,
  Users,
  Clock,
  PieChart,
  Menu,
  UserPlus,
  Briefcase,
  FileDown,
  MessageCircle,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";

export interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

type RoleTheme = {
  initialBg: string;
  accentText: string;
  activeText: string;
  activeRing: string;
};

const ROLE_THEMES: Record<"agent" | "supervisor" | "admin", RoleTheme> = {
  agent: {
    initialBg:  "bg-[hsl(234_89%_60%)] dark:bg-[hsl(234_89%_66%)]",
    accentText: "text-[hsl(234_89%_50%)] dark:text-[hsl(234_89%_72%)]",
    activeText: "text-[hsl(234_89%_45%)] dark:text-[hsl(234_89%_75%)]",
    activeRing: "ring-[hsl(234_89%_60%/0.25)] dark:ring-[hsl(234_89%_66%/0.35)]",
  },
  supervisor: {
    initialBg:  "bg-[hsl(263_70%_60%)] dark:bg-[hsl(263_70%_68%)]",
    accentText: "text-[hsl(263_70%_50%)] dark:text-[hsl(263_70%_72%)]",
    activeText: "text-[hsl(263_70%_45%)] dark:text-[hsl(263_70%_76%)]",
    activeRing: "ring-[hsl(263_70%_60%/0.25)] dark:ring-[hsl(263_70%_68%/0.35)]",
  },
  admin: {
    initialBg:  "bg-[hsl(0_72%_51%)]   dark:bg-[hsl(0_72%_55%)]",
    accentText: "text-[hsl(0_72%_42%)] dark:text-[hsl(0_72%_65%)]",
    activeText: "text-[hsl(0_72%_42%)] dark:text-[hsl(0_72%_70%)]",
    activeRing: "ring-[hsl(0_72%_51%/0.25)] dark:ring-[hsl(0_72%_55%/0.35)]",
  },
};

export function AppShell({ sidebar, children }: AppShellProps) {
  const { user, logout, loading } = useAuth();

  const agentNav = [
    { name: "Dashboard",  path: "/agent/dashboard",          icon: LayoutDashboard },
    { name: "Lookup",     path: "/agent/customers/resolve",  icon: Search },
    { name: "Customers",  path: "/agent/customers",          icon: Users },
    { name: "Follow-ups", path: "/agent/followups",          icon: Clock },
    { name: "Summary",    path: "/agent/summary",            icon: PieChart },
  ];

  const supervisorNav = [
    { name: "Dashboard",  path: "/supervisor/dashboard",          icon: LayoutDashboard },
    { name: "Agents",     path: "/supervisor/create-user",        icon: UserPlus },
    { name: "Projects",   path: "/supervisor/project-allocation", icon: Briefcase },
    { name: "Follow ups", path: "/supervisor/follow-ups",         icon: Clock },
    { name: "Summary",    path: "/supervisor/summarydashboard",   icon: PieChart },
    { name: "Exports",    path: "/supervisor/export-data",        icon: FileDown },
    { name: "Search",     path: "/supervisor/customer-search",    icon: Search },
    { name: "Templates",  path: "/supervisor/whatsapp/templates", icon: MessageCircle },
    { name: "Audit",      path: "/supervisor/whatsapp/audit",     icon: Clock },
  ];

  // Phase 10 note (kept): admin nav holds only the routes that actually exist.
  const adminNav = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  ];

  if (loading || !user) return null;

  const role = (user.role?.toLowerCase() || "agent") as
    | "agent"
    | "supervisor"
    | "admin";

  let navItems = agentNav;
  let homeLink = "/agent/dashboard";
  if (role === "supervisor") {
    navItems = supervisorNav;
    homeLink = "/supervisor/dashboard";
  } else if (role === "admin") {
    navItems = adminNav;
    homeLink = "/admin/dashboard";
  }
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.agent;

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors">
      {sidebar && (
        <aside className="w-72 hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-elevation-2">
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white shadow-elevation-1 ${theme.initialBg}`}
              >
                {user.first_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
                AMS
                <span className={`ml-1 text-xs font-semibold ${theme.accentText}`}>
                  PRO
                </span>
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4">{sidebar}</div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between bg-card/85 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-10">
          <div className="flex items-center min-w-0 lg:w-[250px]">
            {!sidebar && (
              <Link
                to={homeLink}
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white shadow-elevation-1 ${theme.initialBg}`}
                >
                  {user.first_name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-foreground text-base hidden sm:inline-block tracking-tight">
                  Welcome, <span className={theme.accentText}>{user.first_name}</span>
                </span>
              </Link>
            )}
          </div>

          <nav className="hidden md:flex items-center justify-center gap-1 bg-muted/60 dark:bg-muted/40 border border-border p-1 rounded-full">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium",
                    "transition-[background-color,color,box-shadow] duration-200 ease-ams-out",
                    isActive
                      ? `bg-card ${theme.activeText} shadow-elevation-1 ring-1 ${theme.activeRing}`
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                  ].join(" ")
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2 sm:gap-3 lg:w-[250px]">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-none">
                {user.username}
              </p>
              <p
                className={`text-[10px] uppercase tracking-wider mt-1 font-bold ${theme.accentText}`}
              >
                {user.role}
              </p>
            </div>

            <div className="h-7 w-px bg-border hidden sm:block" />

            <ThemeToggle />

            <Button
              variant="ghost"
              onClick={logout}
              size="sm"
              className="text-muted-foreground hover:text-danger hover:bg-danger/10 dark:hover:bg-danger/15 gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only sm:inline-block">Logout</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
