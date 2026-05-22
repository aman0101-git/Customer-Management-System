// ============================================================================
// PHASE 3 — SupervisorExportPage
// ----------------------------------------------------------------------------
// React Query, blob download, and date-preset logic preserved verbatim.
// Visual layer tokenized:
//   - PageHeader replaces hand-rolled title row.
//   - Date presets use design-system Button outlines.
//   - Action buttons use brand and success semantics (no more dark: tweaks).
// ============================================================================

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import http from "@/lib/http";
import { AppShell } from "@/components/ui/app-shell";
import { Calendar as CalendarIcon, Download, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RouteFallback from "@/components/system/RouteFallback";
import PageHeader from "@/components/system/PageHeader";

interface Agent { id: number; name: string }
interface Project { id: number; name: string }

const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "virtual-meet", "pending", "completed", "lost", "visit-done", "booking-done",
] as const;

export default function SupervisorExportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  const [loadingFormat, setLoadingFormat] = useState<"csv" | "xlsx" | null>(null);

  const agentsQuery = useQuery<Agent[]>({
    queryKey: ["supervisor", "agents"],
    queryFn: async () => {
      const res = await http.get("/api/supervisor/summary-dashboard?section=associates");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const projectsQuery = useQuery<Project[]>({
    queryKey: ["supervisor", "projects"],
    queryFn: async () => {
      const res = await http.get("/api/supervisor/summary-dashboard?section=projects");
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const agents = agentsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const filtersLoading = agentsQuery.isLoading || projectsQuery.isLoading;

  const handleDownload = async (format: "csv" | "xlsx") => {
    setLoadingFormat(format);
    try {
      const response = await http.get("/api/supervisor/export", {
        params: { format, agentId: selectedAgent, projectId: selectedProject, status: selectedStatus, startDate, endDate },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `AMS_Export_${timestamp}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} export ready — download started.`);
    } catch (error) {
      console.error("Download failed", error);
      toast.error("Export failed. Please try again.", {
        action: { label: "Retry", onClick: () => handleDownload(format) },
      });
    } finally {
      setLoadingFormat(null);
    }
  };

  if (!user) return <RouteFallback />;

  const isDownloading = loadingFormat !== null;

  const presets: Array<{ label: string; fn: () => void }> = [
    { label: "Today", fn: () => { const d = new Date().toISOString().split("T")[0]; setStartDate(d); setEndDate(d); } },
    { label: "This Week", fn: () => {
        const now = new Date();
        const day = now.getDay();
        const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        setStartDate(mon.toISOString().split("T")[0]);
        setEndDate(sun.toISOString().split("T")[0]);
      } },
    { label: "This Month", fn: () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(first.toISOString().split("T")[0]);
        setEndDate(last.toISOString().split("T")[0]);
      } },
    { label: "Last Month", fn: () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last  = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(first.toISOString().split("T")[0]);
        setEndDate(last.toISOString().split("T")[0]);
      } },
  ];

  return (
    <AppShell sidebar={null}>
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Export Data"
          description="Generate customized reports from the database."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
              <X className="w-4 h-4" />
              Back
            </Button>
          }
        />

        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-elevation-1 mb-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-foreground">
            <CalendarIcon className="w-5 h-5 text-brand" />
            Report Criteria
          </h2>

          {!filtersLoading && (
            <div className="flex flex-wrap gap-2 mb-5">
              {presets.map(({ label, fn }) => (
                <Button key={label} type="button" variant="outline" size="sm" onClick={fn}>
                  {label}
                </Button>
              ))}
            </div>
          )}

          {filtersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`space-y-2 ${i === 4 ? "md:col-span-2" : ""}`}>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">From Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">To Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger><SelectValue placeholder="All Agents" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Filter by Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace(/-/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            disabled={isDownloading || filtersLoading}
            onClick={() => handleDownload("csv")}
            className="h-auto p-4 gap-3 bg-success text-success-foreground hover:bg-success/90 rounded-xl"
          >
            {loadingFormat === "csv" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating CSV…
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Download CSV
              </>
            )}
          </Button>

          <Button
            disabled={isDownloading || filtersLoading}
            onClick={() => handleDownload("xlsx")}
            className="h-auto p-4 gap-3 rounded-xl"
          >
            {loadingFormat === "xlsx" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating XLSX…
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Download XLSX
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
