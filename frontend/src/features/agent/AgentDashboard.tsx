// ============================================================================
// AgentDashboard - Analytics Overview
// ----------------------------------------------------------------------------
// UI-only enterprise analytics dashboard focusing on 3 domains:
// 1) Customers, 2) Follow-ups, 3) Summary.
// Designed with clickable card wrappers to imply navigation to detail pages.
// Uses Recharts for lightweight, clean data visualization.
// ============================================================================

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/ui/app-shell";
import RouteFallback from "@/components/system/RouteFallback";
import PageHeader from "@/components/system/PageHeader";
import {
  Users,
  AlarmClock,
  ChartNoAxesCombined,
  ChevronRight,
  ArrowUpRight,
  Filter
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- Mock Data for Layout Preview ---
const mockFollowUpTimeline = [
  { name: "Overdue", count: 18, color: "#ef4444" },
  { name: "Due Today", count: 42, color: "#f59e0b" },
  { name: "Upcoming", count: 65, color: "#3b82f6" },
];

const mockFollowUpStatus = [
  { name: "Not Reachable", count: 24 },
  { name: "VC", count: 56 },
  { name: "VP", count: 31 },
  { name: "SDOW", count: 12 },
];

const mockSummaryDistribution = [
  { name: "New", value: 120, color: "#3b82f6" },
  { name: "In Progress", value: 250, color: "#8b5cf6" },
  { name: "Converted", value: 85, color: "#10b981" },
  { name: "Dropped", value: 45, color: "#64748b" },
];

export default function AgentDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("Today");

  if (loading || !user) return <RouteFallback />;

  const filters = ["Today", "Yesterday", "This Week", "This Month", "Custom"];

  return (
    <AppShell sidebar={null}>
      {/* HEADER & TIME FILTER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <PageHeader
          eyebrow="Agent Analytics Overview"
          title={`Welcome back, ${user.first_name || "Agent"}`}
          description="High-level metrics for your customers and follow-ups."
          className="mb-0"
        />
        
        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-lg border border-border overflow-x-auto">
          <Filter className="w-4 h-4 text-muted-foreground ml-2 mr-1 shrink-0" />
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter(filter)}
              className="text-xs h-7 px-3 rounded-md"
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ==================================================================== */}
        {/* 1) CUSTOMERS SECTION (Spans 4 cols on large screens)                 */}
        {/* ==================================================================== */}
        <Card 
          className="lg:col-span-4 group cursor-pointer hover:shadow-md hover:border-brand/40 transition-all duration-200 flex flex-col"
          onClick={() => navigate("/agent/customers")}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                <Users className="w-4 h-4" />
              </span>
              Customer Activity
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-blue-50">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-muted/10">
                <span className="text-sm font-medium text-muted-foreground mb-1">Created</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">24</span>
                  <span className="text-xs text-emerald-600 flex items-center font-medium">
                    <ArrowUpRight className="w-3 h-3" /> 12%
                  </span>
                </div>
              </div>
              <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-muted/10">
                <span className="text-sm font-medium text-muted-foreground mb-1">Updated</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">148</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================================== */}
        {/* 2) FOLLOW-UPS SECTION (Spans 8 cols on large screens)                */}
        {/* ==================================================================== */}
        <Card 
          className="lg:col-span-8 group cursor-pointer hover:shadow-md hover:border-brand/40 transition-all duration-200 flex flex-col"
          onClick={() => navigate("/agent/followups")}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <AlarmClock className="w-4 h-4" />
              </span>
              Follow-up Metrics
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-amber-50">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[200px]">
              
              {/* Chart A: Timeline */}
              <div className="flex flex-col h-full">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Timeline</span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockFollowUpTimeline} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {mockFollowUpTimeline.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart B: Status Distribution */}
              <div className="flex flex-col h-full">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Status Distribution</span>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockFollowUpStatus} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ==================================================================== */}
        {/* 3) SUMMARY SECTION (Spans full width or 12 cols below)               */}
        {/* ==================================================================== */}
        <Card 
          className="lg:col-span-12 group cursor-pointer hover:shadow-md hover:border-brand/40 transition-all duration-200"
          onClick={() => navigate("/agent/summary")}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
                <ChartNoAxesCombined className="w-4 h-4" />
              </span>
              Overall System Summary
            </CardTitle>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground group-hover:text-purple-600 transition-colors">View full report</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-purple-50">
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-2">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              
              <div className="h-[220px] w-full md:w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockSummaryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {mockSummaryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-3 w-full md:w-auto">
                {mockSummaryDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-6 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}