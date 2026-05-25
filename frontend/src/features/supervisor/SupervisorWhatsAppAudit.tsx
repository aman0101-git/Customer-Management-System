// ============================================================================
// PHASE 3 + 4 — SupervisorWhatsAppAudit
// ----------------------------------------------------------------------------
// Fetch logic, debounce, CSV export, status badge color mapping preserved.
// Phase 3 visual layer: PageHeader, SectionCard, EmptyState, semantic badge.
// Phase 4: spinner-only loading → skeleton row block.
// ============================================================================

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { Loader2, Filter, Calendar, User, MessageCircle, Download } from "lucide-react";
import PageHeader from "@/components/system/PageHeader";
import SectionCard from "@/components/system/SectionCard";
import EmptyState from "@/components/system/EmptyState";
import NativeSelect from "@/components/system/NativeSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatISTDateTime24 } from "@/lib/formatIST";

interface AuditLogEntry {
  id: number;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  status: string;
  first_name: string;
  last_name: string;
  customer_name: string;
  phone: string;
  project_name: string;
  template_code?: string;
  delivery_mode: string;
  message_preview: string;
}

export default function SupervisorWhatsAppAudit() {
  const { user, loading: authLoading } = useAuth();
  const [auditData, setAuditData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAgents();
      fetchAuditLog();
    }
  }, [user]);

  const fetchAgents = async () => {
    try {
      const res = await axios.get("/api/users", { withCredentials: true });
      if (res.data && Array.isArray(res.data)) {
        setAgents(res.data.filter((u: any) => u.role === "AGENT"));
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    }
  };

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAgent) params.append("agentId", filterAgent);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const res = await axios.get(`/api/supervisor/whatsapp/audit?${params.toString()}`, { withCredentials: true });

      if (res.data && res.data.data) {
        setAuditData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch audit log:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => fetchAuditLog();
  const handleClearFilters = () => {
    setFilterAgent("");
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const exportToCSV = () => {
    if (auditData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date/Time", "Agent", "Customer", "Project", "Template"];
    const rows = auditData.map((entry) => [
      formatDateTime(entry.sent_at),
      `${entry.first_name} ${entry.last_name}`,
      entry.customer_name,
      entry.project_name || "-",
      entry.template_code || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return escaped.includes(",") ? `"${escaped}"` : escaped;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `whatsapp_audit_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Closeout: IST 24h via shared helper. Removes browser-locale drift.
  const formatDateTime = (dateStr: string | undefined) => {
    const out = formatISTDateTime24(dateStr);
    return out === "—" ? "-" : out;
  };

  const formatMessagePreview = (message: string) =>
    message.length > 100 ? message.substring(0, 100) + "..." : message;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SENT":      return "bg-success/15 text-success border-success/30";
      case "DELIVERED": return "bg-info/15 text-info border-info/30";
      case "READ":      return "bg-brand/15 text-brand border-brand/30";
      case "FAILED":    return "bg-danger/15 text-danger border-danger/30";
      default:          return "bg-muted text-muted-foreground border-border";
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          eyebrow="WhatsApp"
          title="WhatsApp Audit Log"
          description="Track all WhatsApp messages sent by your agents."
        />

        <SectionCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                <User className="w-4 h-4" /> Agent
              </Label>
              <NativeSelect
                value={filterAgent}
                onChange={(e) => setFilterAgent(e.target.value)}
                wrapperClassName="w-full"
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" /> From
              </Label>
              <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" /> To
              </Label>
              <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleFilterApply} className="flex-1 gap-2">
                <Filter className="w-4 h-4" />
                Apply Filter
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                Clear
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground tabular-nums">{auditData.length}</span> records
            </div>
            <Button
              onClick={exportToCSV}
              disabled={auditData.length === 0}
              className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </Button>
          </div>
        </SectionCard>

        <div className="bg-card text-card-foreground rounded-lg border border-border shadow-elevation-1 overflow-hidden">
          {loading ? (
            // Phase 4: skeleton rows instead of a bare spinner so layout is stable.
            <div className="p-4 space-y-3">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : auditData.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No records found"
              description="Try adjusting your filters."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums-tracking">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    {["Date/Time", "Agent", "Customer", "Project", "Template", "Message", "Delivery Mode", "Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditData.map((entry, idx) => (
                    <tr key={entry.id} className={`border-b border-border hover:bg-accent/40 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-3 text-foreground">{formatDateTime(entry.sent_at)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{entry.first_name} {entry.last_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{entry.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{entry.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{entry.project_name}</td>
                      <td className="px-4 py-3">
                        {entry.template_code ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/15 text-brand border border-brand/30">
                            {entry.template_code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs">
                        <div className="truncate text-xs" title={entry.message_preview}>
                          {formatMessagePreview(entry.message_preview)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{entry.delivery_mode}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
