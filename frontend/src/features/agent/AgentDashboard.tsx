// ============================================================================
// PHASE 2 — AgentDashboard
// ----------------------------------------------------------------------------
// Adopts the new design language without changing routing, business logic,
// auth handling, or feature behaviour.
//
// Changes from phase 0/1:
//   - PageHeader replaces the ad-hoc gradient pill row at the top.
//   - Customer Lookup is now a primary Button (with the brand token) instead of
//     a hand-rolled gradient anchor with hardcoded indigo/blue.
//   - Cards still use the design-system Card with accent strips; the extra
//     hover:scale-[1.02] pile-on was removed — Phase 1 Card already has the
//     restrained -0.5 lift baked in.
//   - Card titles get icon containers in muted/accent tones for hierarchy.
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
} from "lucide-react";

export default function AgentDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (loading || !user) return <RouteFallback />;

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
    </AppShell>
  );
}
