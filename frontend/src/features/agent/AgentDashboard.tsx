// ============================================================================
// PHASE 2 + 5 — AgentDashboard
// ----------------------------------------------------------------------------
// Phase 2 design language preserved: PageHeader, primary CTA, three accent
// Cards for Customers / Followups / Summary.
//
// Phase 5 (May 2026):
//   Adds a small "Quick lookup" navigation strip below the action cards so
//   agents can jump straight to their three primary workspaces without
//   re-clicking from the card grid. Uses the same icon language as the
//   header pill nav for visual continuity.
// ============================================================================

import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/ui/app-shell";
import RouteFallback from "@/components/system/RouteFallback";
import PageHeader from "@/components/system/PageHeader";
import {
  ChartNoAxesCombined,
  Users,
  AlarmClock,
  Search,
  ArrowRight,
} from "lucide-react";

export default function AgentDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading || !user) return <RouteFallback />;

  // Phase 5: shared quick-lookup destinations. Kept tight (3 items).
  const quickLinks = [
    { label: "Customers",         path: "/agent/customers",  icon: Users },
    { label: "Follow-ups",        path: "/agent/followups",  icon: AlarmClock },
    { label: "Summary Dashboard", path: "/agent/summary",    icon: ChartNoAxesCombined },
  ];

  return (
    <AppShell sidebar={null}>
      <PageHeader
        eyebrow={`${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
        title={`Welcome back, ${user.first_name}`}
        description="Jump into a lookup or pick up where you left off."
        actions={
          <Button asChild size="lg" className="gap-2">
            <Link to="/agent/customers/resolve">
              <Search className="w-4 h-4" />
              <span>Customer Lookup</span>
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          accent="blue"
          className="cursor-pointer"
          onClick={() => navigate("/agent/customers")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/agent/customers")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-info/15 text-info">
                <Users className="w-5 h-5" />
              </span>
              My Customers
            </CardTitle>
            <CardDescription>View and manage your customers</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="yellow"
          className="cursor-pointer"
          onClick={() => navigate("/agent/followups")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/agent/followups")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <AlarmClock className="w-5 h-5" />
              </span>
              My Follow-ups
            </CardTitle>
            <CardDescription>Your scheduled follow-ups</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="purple"
          className="cursor-pointer"
          onClick={() => navigate("/agent/summary")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/agent/summary")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(263_70%_60%/0.18)] text-[hsl(263_70%_45%)] dark:text-[hsl(263_70%_72%)]">
                <ChartNoAxesCombined className="w-5 h-5" />
              </span>
              Summary Dashboards
            </CardTitle>
            <CardDescription>Quick view of today's activity</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Phase 5: Quick lookup strip — small navigation convenience below
          the action cards. Same surface elevation as the cards but compact. */}
      <section className="mt-8" aria-label="Quick lookup">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick lookup
          </h2>
          <span className="text-xs text-muted-foreground">Jump directly to a workspace</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="
                group flex items-center justify-between gap-3
                rounded-lg border border-border bg-card text-card-foreground
                px-4 py-3 shadow-elevation-1 hover:shadow-elevation-2
                hover:border-brand/40
                transition-[box-shadow,border-color,background-color] duration-200 ease-ams-out
                focus-visible:outline-none
              "
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-brand/15 group-hover:text-brand transition-colors">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-foreground truncate">{label}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-[color,transform] duration-200 ease-ams-out shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
