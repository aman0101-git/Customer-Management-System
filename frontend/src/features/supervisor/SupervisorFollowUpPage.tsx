// ============================================================================
// PHASE 3 + 5 — SupervisorFollowUpPage
// ----------------------------------------------------------------------------
// All Phase 5/7/10 data logic preserved verbatim. Phase 3 visual layer
// preserved. Phase 5: composes agent's full name (first + last) on the
// frontend after backend adds agent_last_name to the SELECT.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { AppShell } from "@/components/ui/app-shell";
import { differenceInCalendarDays, isBefore, isToday, startOfDay, parseISO } from "date-fns";
import { formatISTDateLong, formatISTTime24, formatISTDateTime24 } from "@/lib/formatIST";
import {
  Calendar,
  Clock,
  AlertCircle,
  Briefcase,
  User as UserIcon,
  CheckCircle2,
  Phone,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AgeDistributionBar, { type AgeBucket } from "@/components/system/AgeDistributionBar";
import { getOverdueInfo } from "@/lib/urgency";
import PageHeader from "@/components/system/PageHeader";
import NativeSelect from "@/components/system/NativeSelect";
import StatTile from "@/components/system/StatTile";
import EmptyState from "@/components/system/EmptyState";

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

const STATUS_OPTIONS = [
  "follow-up", "sdow", "virtual-meet-confirmed", "visit-confirmed", "visit-proposed",
  "not-reachable", "virtual-meet", "pending",
];

const CATEGORY_ORDER = { past: 0, today: 1, future: 2 } as const;

// Phase 5: compose agent full name with fallbacks. Backend now returns
// agent_first_name + agent_last_name; agent_name remains as a legacy first-only alias.
function composeAgentName(item: any): string {
  if (item.agent_first_name && item.agent_last_name) {
    return `${item.agent_first_name} ${item.agent_last_name}`;
  }
  return item.agent_first_name || item.agent_name || "—";
}

export default function SupervisorFollowUpPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'today' | 'future'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFilters();
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user && !loading) fetchData();
  }, [selectedAgent, selectedProject, selectedStatus]);

  const fetchFilters = async () => {
    try {
      const [agentRes, projectRes] = await Promise.all([
        axios.get("/api/supervisor/summary-dashboard?section=associates"),
        axios.get("/api/supervisor/summary-dashboard?section=projects"),
      ]);
      setAgents(Array.isArray(agentRes.data) ? agentRes.data : []);
      setProjects(Array.isArray(projectRes.data) ? projectRes.data : []);
    } catch (err) {
      console.error("Error loading filters", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/supervisor/follow-ups`, {
        params: { agentId: selectedAgent, projectId: selectedProject, status: selectedStatus },
      });

      const todayStart = startOfDay(new Date());
      const processed = (res.data || []).map((item: any) => {
        const fDate = parseISO(item.follow_up_date);
        const itemDateStart = startOfDay(fDate);
        let category = 'future';
        if (isBefore(itemDateStart, todayStart)) category = 'past';
        else if (isToday(itemDateStart)) category = 'today';
        return { ...item, category, parsedDate: fDate };
      });

      setData(processed);
    } catch (err) {
      console.error("Failed to fetch followups", err);
    } finally {
      setLoading(false);
    }
  };

  const counts = useMemo(() => {
    let past = 0, today = 0, future = 0;
    for (const i of data) {
      if (i.category === 'past') past++;
      else if (i.category === 'today') today++;
      else if (i.category === 'future') future++;
    }
    return { past, today, future };
  }, [data]);

  const overdueBuckets = useMemo((): AgeBucket[] => {
    let b1 = 0, b2 = 0, b3 = 0, b4 = 0;
    const todayStart = startOfDay(new Date());
    for (const item of data) {
      if (item.category !== 'past') continue;
      const daysLate = differenceInCalendarDays(todayStart, startOfDay(item.parsedDate));
      if (daysLate === 1) b1++;
      else if (daysLate <= 3) b2++;
      else if (daysLate <= 7) b3++;
      else b4++;
    }
    return [
      { label: "1 day",    count: b1, className: "bg-warning" },
      { label: "2-3 days", count: b2, className: "bg-warning/80" },
      { label: "4-7 days", count: b3, className: "bg-danger/80" },
      { label: "8+ days",  count: b4, className: "bg-danger" },
    ];
  }, [data]);

  const displayList = useMemo(() => {
    const filtered = timeFilter === 'all' ? data : data.filter(i => i.category === timeFilter);
    return filtered.slice().sort((a, b) => {
      const catDiff =
        (CATEGORY_ORDER[a.category as keyof typeof CATEGORY_ORDER] ?? 2) -
        (CATEGORY_ORDER[b.category as keyof typeof CATEGORY_ORDER] ?? 2);
      if (catDiff !== 0) return catDiff;
      return a.parsedDate.getTime() - b.parsedDate.getTime();
    });
  }, [data, timeFilter]);

  const getRowStyle = (category: string) => {
    switch (category) {
      case 'past':  return "bg-danger/5 hover:bg-danger/10 border-l-4 border-l-danger";
      case 'today': return "bg-warning/5 hover:bg-warning/10 border-l-4 border-l-warning";
      default:      return "hover:bg-accent/40 border-l-4 border-l-transparent";
    }
  };

  const getStatusBadge = (status: string) => {
    if (status?.includes('confirmed')) return "bg-success/15 text-success border-success/30";
    if (status?.includes('proposed'))  return "bg-info/15 text-info border-info/30";
    return "bg-muted text-muted-foreground border-border";
  };

  const filtersActive = selectedAgent !== 'all' || selectedProject !== 'all' || selectedStatus !== 'all';

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto space-y-6">

        <PageHeader
          title="Follow-up Discipline"
          description="Monitor team schedule and overdue calls."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
              <X className="w-4 h-4" />
              Back
            </Button>
          }
        />

        <div className="flex flex-wrap gap-3 bg-card text-card-foreground p-4 rounded-xl border border-border shadow-elevation-1">
          <NativeSelect icon={UserIcon} value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
            <option value="all">All Agents</option>
            {agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </NativeSelect>
          <NativeSelect icon={Briefcase} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
          <NativeSelect icon={CheckCircle2} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="capitalize">
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status.replace(/-/g, ' ')}</option>
            ))}
          </NativeSelect>
          {filtersActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedAgent('all'); setSelectedProject('all'); setSelectedStatus('all'); }}
              title="Reset all filters"
              className="gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </Button>
          )}
        </div>

        {loading && data.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <button
              type="button"
              onClick={() => setTimeFilter(timeFilter === 'past' ? 'all' : 'past')}
              className={`text-left rounded-xl transition-shadow ${timeFilter === 'past' ? "ring-2 ring-danger/40 shadow-elevation-2" : ""}`}
            >
              <StatTile label="Overdue" value={counts.past} tone="danger" icon={AlertCircle} />
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter(timeFilter === 'today' ? 'all' : 'today')}
              className={`text-left rounded-xl transition-shadow ${timeFilter === 'today' ? "ring-2 ring-warning/40 shadow-elevation-2" : ""}`}
            >
              <StatTile label="Due Today" value={counts.today} tone="warning" icon={Clock} />
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter(timeFilter === 'future' ? 'all' : 'future')}
              className={`text-left rounded-xl transition-shadow ${timeFilter === 'future' ? "ring-2 ring-info/40 shadow-elevation-2" : ""}`}
            >
              <StatTile label="Upcoming" value={counts.future} tone="info" icon={Calendar} />
            </button>
          </div>
        )}

        {!loading && counts.past > 0 && (
          <AgeDistributionBar buckets={overdueBuckets} totalLabel="Overdue" />
        )}

        <div className="bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-elevation-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : displayList.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No follow-ups found"
              description="Nothing matches the current selection."
            />
          ) : (
            <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 360px)" }}>
              <table className="w-full text-left text-sm tabular-nums-tracking">
                <thead className="sticky top-0 z-10 bg-muted/70 backdrop-blur-sm border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    {["Customer & Agent", "Contact", "Project", "Status", "Follow Up Date", "Updated"].map((h) => (
                      <th key={h} className="px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayList.map((item) => {
                    const overdueInfo = item.category === 'past' ? getOverdueInfo(item.follow_up_date) : null;
                    return (
                      <tr key={item.agent_customer_id} className={`transition-colors ${getRowStyle(item.category)}`}>
                        <td className="px-6 py-3">
                          <div className="font-semibold text-foreground">{item.customer_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            {/* Phase 5: full name (first + last) composed on the frontend. */}
                            <UserIcon className="w-3 h-3" /> {composeAgentName(item)}
                          </div>
                        </td>
                        <td className="px-6 py-3"><ContactCell contact={item.contact_number} /></td>
                        <td className="px-6 py-3 text-foreground">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            {item.project_name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide border ${getStatusBadge(item.status_code)}`}>
                            {item.status_code?.replace(/-/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${item.category === 'past' ? 'text-danger' : 'text-foreground'}`}>
                              {/* Closeout: IST + 24h time. Was "h:mm a" (12h locale). */}
                              {formatISTDateLong(item.parsedDate)}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {formatISTTime24(item.parsedDate)}
                            </span>
                          </div>
                          {overdueInfo && overdueInfo.level > 0 && (
                            <span className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold ${overdueInfo.badgeClass}`}>
                              {overdueInfo.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-muted-foreground">
                          {formatISTDateTime24(item.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
