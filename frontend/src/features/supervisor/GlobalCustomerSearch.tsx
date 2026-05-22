// ============================================================================
// PHASE 3 — GlobalCustomerSearch
// ----------------------------------------------------------------------------
// Search logic, debounce, reassignment modal flow preserved byte-equivalent.
//
// Visual changes:
//   - PageHeader replaces hand-rolled title row.
//   - Search bar uses tokenized surface.
//   - Result table token-driven; status badge uses semantic tones.
//   - EmptyState used for both "no results" and "start typing" placeholders.
//   - Reassign modal converted to <Dialog> primitive — same render shape, but
//     overlay/dialog tokens, design-system Buttons, NativeSelect for fields.
// ============================================================================

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/ui/app-shell";
import { format, parseISO } from "date-fns";
import { getOverdueInfo } from "@/lib/urgency";
import {
  Loader2,
  Search,
  User as UserIcon,
  Briefcase,
  Edit2,
  Phone,
  Copy,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/system/PageHeader";
import EmptyState from "@/components/system/EmptyState";
import NativeSelect from "@/components/system/NativeSelect";

function ContactCell({ contact }: { contact: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const val = contact ?? "";
  if (!val) return <span className="text-muted-foreground font-mono">—</span>;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(val).then(() => {
      setCopied(true);
      toast.success("Contact copied");
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-1.5 group/c">
      <a href={`tel:${val}`} onClick={(e) => e.stopPropagation()}
        className="font-mono text-foreground hover:text-brand transition-colors flex items-center gap-1 text-sm">
        <Phone className="w-3 h-3 opacity-0 group-hover/c:opacity-60 shrink-0 transition-opacity" />
        {val}
      </a>
      <button onClick={handleCopy} type="button"
        className="opacity-0 group-hover/c:opacity-100 transition-opacity p-0.5 rounded hover:bg-accent" title="Copy">
        {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
      </button>
    </div>
  );
}

const CLOSED_STATUSES = new Set(["visit-done", "booking-done", "lost", "completed"]);

export default function GlobalCustomerSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const cleanSearchTerm = searchTerm.trim();
    const isTenDigits = /^\d{10}$/.test(cleanSearchTerm);

    const delayDebounceFn = setTimeout(async () => {
      if (isTenDigits && user) {
        setLoading(true);
        setHasSearched(true);
        try {
          const res = await axios.get(`/api/supervisor/customers/search?q=${cleanSearchTerm}`);
          setResults(res.data || []);
        } catch (error) {
          console.error("Search failed", error);
          setResults([]);
          toast.error("Search failed. Please try again.");
        } finally {
          setLoading(false);
        }
      } else if (cleanSearchTerm.length !== 10) {
        setResults([]);
        setHasSearched(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, user]);

  const getStatusBadge = (status: string | null) => {
    if (!status) return "bg-muted text-muted-foreground border-border";
    if (status.includes("confirmed")) return "bg-success/15 text-success border-success/30";
    if (status.includes("proposed") || status.includes("fresh")) return "bg-info/15 text-info border-info/30";
    if (status.includes("lost")) return "bg-danger/15 text-danger border-danger/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const openEditModal = async (customer: any) => {
    setEditingCustomer(customer);
    setSelectedAgentId("");
    setSelectedProjectId("");
    setIsEditModalOpen(true);

    if (agents.length === 0) {
      try {
        const [agentsRes, projectsRes] = await Promise.all([
          axios.get("/api/users"),
          axios.get("/api/supervisor/summary-dashboard?section=projects"),
        ]);
        setAgents(agentsRes.data.filter((u: any) => u.role === "AGENT" && u.is_active === 1));
        setProjects(projectsRes.data);
      } catch (err) {
        console.error("Failed to load options");
        toast.error("Failed to load agents and projects.");
      }
    }
  };

  const handleSaveReassignment = async () => {
    if (!selectedAgentId || !selectedProjectId) {
      toast.error("Please select both an Agent and a Project.");
      return;
    }

    setIsSaving(true);
    try {
      await axios.put(`/api/supervisor/customers/${editingCustomer.customer_id}/reassign`, {
        new_agent_id: selectedAgentId,
        new_project_id: selectedProjectId,
      });
      setIsEditModalOpen(false);
      toast.success("Customer successfully transferred.");
      // Re-trigger debounce by toggling whitespace (preserved Phase 0 hack).
      setSearchTerm(searchTerm + " ");
    } catch (error) {
      toast.error("Failed to reassign customer.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Global Customer Search"
          description="Find any lead across the entire database."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
              <X className="w-4 h-4" />
              Back
            </Button>
          }
        />

        <div className="bg-card text-card-foreground p-5 rounded-xl border border-border shadow-elevation-1">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              maxLength={10}
              placeholder="Enter exact 10-digit contact number..."
              className="w-full pl-10 pr-10 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 transition-[border-color,box-shadow]"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setSearchTerm(value);
              }}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              </div>
            )}
          </div>
        </div>

        <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-elevation-1 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand" />
              <span className="text-muted-foreground text-sm">Searching database...</span>
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={Search}
              title={
                hasSearched && searchTerm.length > 2
                  ? `No customers found for "${searchTerm}"`
                  : "Enter a contact number to begin searching"
              }
              description={hasSearched ? "Try a different 10-digit number." : "Search is debounced and triggers when you type exactly 10 digits."}
            />
          ) : (
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
              <table className="w-full text-left text-sm tabular-nums-tracking">
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-6 py-3">Customer Details</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">Assignment & Project</th>
                    <th className="px-6 py-3">Current Status</th>
                    <th className="px-6 py-3">Next Follow-up</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((item) => {
                    const isClosed = CLOSED_STATUSES.has(item.status_code ?? "");
                    const overdueInfo = (!isClosed && item.follow_up_date)
                      ? getOverdueInfo(item.follow_up_date)
                      : null;
                    const isOverdue = overdueInfo && overdueInfo.level > 0;

                    const rowBorderClass = isOverdue
                      ? overdueInfo!.level >= 3
                        ? "border-l-4 border-l-danger"
                        : overdueInfo!.level >= 2
                        ? "border-l-4 border-l-danger/70"
                        : "border-l-4 border-l-warning"
                      : "border-l-4 border-l-transparent";

                    return (
                      <tr
                        key={item.customer_id}
                        className={`transition-colors hover:bg-accent/40 ${rowBorderClass}`}
                      >
                        <td className="px-6 py-3">
                          <div className="font-semibold text-foreground">{item.customer_name}</div>
                        </td>
                        <td className="px-6 py-3">
                          <ContactCell contact={item.contact} />
                        </td>
                        <td className="px-6 py-3">
                          {item.agent_name ? (
                            <>
                              <div className="flex items-center gap-1 text-sm font-medium text-brand">
                                <UserIcon className="w-3.5 h-3.5" /> {item.agent_name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> {item.project_name || "No Project"}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide border ${getStatusBadge(item.status_code)}`}>
                            {item.status_code ? item.status_code.replace(/-/g, " ") : "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {item.follow_up_date ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {format(parseISO(item.follow_up_date), "dd MMM yyyy")}
                                </span>
                                {item.follow_up_time && (
                                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                                    {item.follow_up_time}
                                  </span>
                                )}
                              </div>
                              {isOverdue && (
                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold w-fit ${overdueInfo!.badgeClass}`}>
                                  {overdueInfo!.label}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(item)}
                            className="gap-1.5 text-brand border-brand/30 hover:bg-brand/10"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reassign Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reassign Lead</DialogTitle>
              <DialogDescription>
                Move this lead to a different agent and project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Customer
                </label>
                <div className="text-foreground bg-muted px-3 py-2.5 rounded-lg border border-border font-medium">
                  {editingCustomer?.customer_name}{" "}
                  <span className="text-muted-foreground font-normal">({editingCustomer?.contact})</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Assign Project
                </label>
                <NativeSelect
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  wrapperClassName="w-full"
                >
                  <option value="" disabled>-- Select Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Assign Agent
                </label>
                <NativeSelect
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  wrapperClassName="w-full"
                >
                  <option value="" disabled>-- Select Agent --</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.first_name} {a.last_name} (@{a.username})</option>
                  ))}
                </NativeSelect>
              </div>

              <div className="text-xs text-warning bg-warning/10 p-3 rounded-lg border border-warning/30">
                <strong>Note:</strong> Reassigning will close the current pipeline and reset the follow-up schedule so the new agent gets a clean slate.
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveReassignment}
                disabled={isSaving || !selectedAgentId || !selectedProjectId}
                className="gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
