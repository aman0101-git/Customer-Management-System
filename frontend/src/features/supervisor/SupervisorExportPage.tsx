import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import http from "@/lib/http";
import { AppShell } from "@/components/ui/app-shell";
import { ArrowLeft, Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
}

const STATUS_OPTIONS = [
  "follow-up",
  "sdow",
  "virtual-meet-confirmed",
  "visit-confirmed",
  "visit-proposed",
  "not-reachable",
  "virtual-meet",
  "pending",
  "completed",
  "lost",
  "visit-done",
  "booking-done",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupervisorExportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter selections
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Date range — default to today
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  // Per-format loading: null = idle, 'csv'/'xlsx' = that format is generating
  const [loadingFormat, setLoadingFormat] = useState<"csv" | "xlsx" | null>(null);

  // ---------------------------------------------------------------------------
  // Filter data — reuses query keys from SupervisorSummaryDashboard so data is
  // served from the 5-min cache when navigating between those pages.
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Download handler — blob streaming uses per-request responseType override;
  // withCredentials is inherited from the shared http instance.
  // ---------------------------------------------------------------------------

  const handleDownload = async (format: "csv" | "xlsx") => {
    setLoadingFormat(format);
    try {
      const response = await http.get("/api/supervisor/export", {
        params: {
          format,
          agentId: selectedAgent,
          projectId: selectedProject,
          status: selectedStatus,
          startDate,
          endDate,
        },
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

  return (
    <AppShell sidebar={null}>
      <div className="p-4 md:p-8 max-w-4xl mx-auto font-sans">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Export Data</h1>
            <p className="text-slate-500 dark:text-slate-400">
              Generate customized reports from the database.
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Report Criteria
          </h2>

          {/* Skeleton while agents/projects load from API (or warm up from cache) */}
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

              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="startDate">From Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">To Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Agent */}
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label>Select Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status — full width */}
              <div className="space-y-2 md:col-span-2">
                <Label>Filter by Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
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

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="outline"
            disabled={isDownloading || filtersLoading}
            onClick={() => handleDownload("csv")}
            className="flex items-center justify-center gap-3 p-4 h-auto bg-green-50 border-2 border-green-200 hover:bg-green-100 hover:border-green-500 text-green-800 dark:bg-green-950/20 dark:border-green-900 dark:hover:border-green-700 dark:text-green-400 rounded-xl font-semibold disabled:opacity-50 transition-all"
          >
            {loadingFormat === "csv" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating CSV&hellip;
              </>
            ) : (
              <>
                <Download className="w-6 h-6" />
                Download CSV
              </>
            )}
          </Button>

          <Button
            variant="outline"
            disabled={isDownloading || filtersLoading}
            onClick={() => handleDownload("xlsx")}
            className="flex items-center justify-center gap-3 p-4 h-auto bg-blue-50 border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 dark:bg-blue-950/20 dark:border-slate-700 dark:hover:border-blue-700 dark:text-blue-400 rounded-xl font-semibold text-slate-600 disabled:opacity-50 transition-all"
          >
            {loadingFormat === "xlsx" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating XLSX&hellip;
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
