// ============================================================================
// PHASE 3 + 6 — SupervisorExportPage
// ----------------------------------------------------------------------------
// Phase 3: PageHeader, tokenized buttons, date presets, semantic CSV/XLSX
// actions, blob download via the shared http instance.
//
// Phase 6: agents/projects/status are now MULTI-select.
//   - No selection = include all (server default).
//   - Frontend serializes the selected[] arrays as comma-separated query
//     params, which the backend's parseMultiFilter accepts either as CSV or
//     as a string[] (express auto-coerces repeated ?status=… into arrays).
//   - Single-value behaviour stays backward compatible.
// ============================================================================

import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import http from "@/lib/http";
import { AppShell } from "@/components/ui/app-shell";
import { Calendar as CalendarIcon, Download, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RouteFallback from "@/components/system/RouteFallback";
import PageHeader from "@/components/system/PageHeader";
import MultiSelect, { type MultiSelectOption } from "@/components/system/MultiSelect";

interface Agent { id: number; name: string }
interface Project { id: number; name: string }

const STATUS_OPTIONS: MultiSelectOption[] = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "virtual-meet-done", "ringing", "completed", "lost", "visit-done", "booking-done",
].map(s => ({ value: s, label: s.replace(/-/g, " ") }));

export default function SupervisorExportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Phase 6: multi-select state. Empty array = "all" semantics; we don't
  // serialize the param when empty, letting the backend treat it as no filter.
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

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

  const agentOptions = useMemo<MultiSelectOption[]>(
    () => agents.map(a => ({ value: String(a.id), label: a.name })),
    [agents]
  );
  const projectOptions = useMemo<MultiSelectOption[]>(
    () => projects.map(p => ({ value: String(p.id), label: p.name })),
    [projects]
  );

  const handleDownload = async (format: "csv" | "xlsx") => {
    setLoadingFormat(format);
    try {
      // Phase 6: Only attach a filter param when a selection exists.
      // Empty = "include all" (backend service.parseMultiFilter handles this).
      const params: Record<string, string> = { format, startDate, endDate };
      if (selectedAgents.length > 0)   params.agentId   = selectedAgents.join(",");
      if (selectedProjects.length > 0) params.projectId = selectedProjects.join(",");
      if (selectedStatuses.length > 0) params.status    = selectedStatuses.join(",");

      const response = await http.get("/api/supervisor/export", {
        params,
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

  const totalSelected =
    selectedAgents.length + selectedProjects.length + selectedStatuses.length;

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
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground">
              <CalendarIcon className="w-5 h-5 text-brand" />
              Report Criteria
            </h2>
            {totalSelected === 0 && !filtersLoading && (
              <span className="text-xs text-muted-foreground">
                No filters selected — exporting <span className="font-semibold text-foreground">all</span> records.
              </span>
            )}
          </div>

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
                <Label htmlFor="select-agents">Agents</Label>
                <MultiSelect
                  id="select-agents"
                  options={agentOptions}
                  selected={selectedAgents}
                  onChange={setSelectedAgents}
                  allLabel="All Agents"
                  aria-label="Select agents"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="select-projects">Projects</Label>
                <MultiSelect
                  id="select-projects"
                  options={projectOptions}
                  selected={selectedProjects}
                  onChange={setSelectedProjects}
                  allLabel="All Projects"
                  aria-label="Select projects"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="select-status">Status</Label>
                <MultiSelect
                  id="select-status"
                  options={STATUS_OPTIONS}
                  selected={selectedStatuses}
                  onChange={setSelectedStatuses}
                  allLabel="All Statuses"
                  aria-label="Select statuses"
                />
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
