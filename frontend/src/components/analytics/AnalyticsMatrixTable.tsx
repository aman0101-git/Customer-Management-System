// ============================================================================
// AnalyticsMatrixTable
// ----------------------------------------------------------------------------
// Agent Performance Matrix: rows = agents, columns = statuses. Renders the
// pre-aggregated payload from GET /api/supervisor/matrix — NO client-side
// aggregation of raw leads. Only agents with real data for the selected
// project + time range are present in the payload (backend-filtered).
//
// Behaviour:
//   - sticky header row + sticky first column (agent name) for scroll context
//   - horizontal scroll on narrow screens (mobile-friendly)
//   - color-coded status column headers (scan speed)
//   - sortable columns (any status, Total, or Completion); default Total desc
//   - clickable count cells → onCellClick(agentId, statusCode, agentName)
//   - hover row highlight, zebra striping, grand-total footer
//   - final column = Completion Rate (completed / total). No conversion rate.
// ============================================================================

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export interface MatrixAgent {
  agent_id: number;
  agent_name: string;
  statuses: Record<string, number>;
  total: number;
  completed: number;
  completion_rate: number;
}

export interface MatrixData {
  statusOrder: string[];
  agents: MatrixAgent[];
  columnTotals: Record<string, number>;
}

// Completed / done statuses — used for the team-level footer Completion Rate.
const COMPLETED_STATUSES = ["visit-done", "virtual-meet-done", "booking-done"];

// Short labels + semantic tone per status (color coding per spec).
const STATUS_META: Record<string, { label: string; head: string; cell: string }> = {
  ringing:                 { label: "Ringing",      head: "text-danger",   cell: "text-danger" },
  "follow-up":             { label: "Follow-up",    head: "text-warning",  cell: "text-warning" },
  "visit-proposed":        { label: "Visit Prop.",  head: "text-info",     cell: "text-info" },
  "visit-confirmed":       { label: "Visit Conf.",  head: "text-chart-3",  cell: "text-chart-3" },
  "virtual-meet-confirmed":{ label: "VM Conf.",     head: "text-chart-4",  cell: "text-chart-4" },
  "virtual-meet-done":     { label: "VM Done",      head: "text-success",  cell: "text-success" },
  "visit-done":            { label: "Visit Done",   head: "text-warning",  cell: "text-warning" },
  "booking-done":          { label: "Booking",      head: "text-success",  cell: "text-success" },
  sdow:                    { label: "SDOW",         head: "text-muted-foreground", cell: "text-muted-foreground" },
  "not-reachable":         { label: "Not Reach.",   head: "text-chart-5",  cell: "text-chart-5" },
  lost:                    { label: "Lost",         head: "text-danger",   cell: "text-danger" },
};

const metaFor = (code: string) =>
  STATUS_META[code] ?? { label: code.replace(/-/g, " "), head: "text-foreground", cell: "text-foreground" };

type SortKey = string; // a status code, "total", or "completion"
type SortDir = "asc" | "desc";

interface Props {
  data: MatrixData;
  onCellClick: (agentId: number, statusCode: string, agentName: string) => void;
}

export default function AnalyticsMatrixTable({ data, onCellClick }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const statuses = data.statusOrder;

  const sortedAgents = useMemo(() => {
    const rows = [...data.agents];
    const valueOf = (a: MatrixAgent) => {
      if (sortKey === "total") return a.total;
      if (sortKey === "completion") return a.completion_rate;
      return a.statuses[sortKey] ?? 0;
    };
    rows.sort((x, y) => {
      const diff = valueOf(x) - valueOf(y);
      if (diff !== 0) return sortDir === "asc" ? diff : -diff;
      return x.agent_name.localeCompare(y.agent_name); // stable tie-break
    });
    return rows;
  }, [data.agents, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const grandTotal = statuses.reduce((s, code) => s + (data.columnTotals[code] ?? 0), 0);
  const teamCompleted = COMPLETED_STATUSES.reduce((s, code) => s + (data.columnTotals[code] ?? 0), 0);
  const teamCompletion = grandTotal > 0 ? Number(((teamCompleted / grandTotal) * 100).toFixed(1)) : 0;

  if (!data.agents.length) {
    return (
      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-elevation-1 p-10 text-center text-muted-foreground italic">
        No agents have data for the selected project and time range.
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-elevation-1 border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse tabular-nums-tracking">
          <thead>
            <tr className="bg-muted/60 text-foreground">
              <th
                onClick={() => toggleSort("total")}
                className="sticky left-0 z-20 bg-muted px-3 py-3 text-left w-44 min-w-44 border border-border font-bold uppercase tracking-wider cursor-pointer select-none"
              >
                <span className="inline-flex items-center gap-1">Agent</span>
              </th>
              {statuses.map((code) => {
                const m = metaFor(code);
                return (
                  <th
                    key={code}
                    onClick={() => toggleSort(code)}
                    className="px-2 py-3 text-center w-20 min-w-[4.5rem] border border-border font-bold cursor-pointer select-none hover:bg-muted"
                    title={`Sort by ${m.label}`}
                  >
                    <span className={`inline-flex items-center justify-center gap-0.5 ${m.head}`}>
                      {m.label} <SortIcon k={code} />
                    </span>
                  </th>
                );
              })}
              <th
                onClick={() => toggleSort("total")}
                className="px-2 py-3 text-center w-20 border border-border bg-muted font-bold cursor-pointer select-none"
              >
                <span className="inline-flex items-center justify-center gap-0.5">Total <SortIcon k="total" /></span>
              </th>
              <th
                onClick={() => toggleSort("completion")}
                className="px-2 py-3 text-center w-24 border border-border bg-muted font-bold cursor-pointer select-none"
                title="Completion Rate = completed / total"
              >
                <span className="inline-flex items-center justify-center gap-0.5">Compl% <SortIcon k="completion" /></span>
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedAgents.map((a, idx) => {
              const rowBg = idx % 2 === 0 ? "bg-card" : "bg-muted/30";
              return (
                <tr key={a.agent_id} className={`${rowBg} hover:bg-accent/40 transition-colors group`}>
                  <td
                    className={`sticky left-0 z-10 ${idx % 2 === 0 ? "bg-card" : "bg-muted/30"} group-hover:bg-accent/40 px-3 py-2.5 font-semibold text-foreground whitespace-nowrap border border-border`}
                  >
                    {a.agent_name}
                  </td>

                  {statuses.map((code) => {
                    const c = a.statuses[code] ?? 0;
                    const m = metaFor(code);
                    return (
                      <td
                        key={code}
                        onClick={() => c > 0 && onCellClick(a.agent_id, code, a.agent_name)}
                        className={`px-2 py-2.5 text-center border border-border transition-colors ${
                          c > 0 ? "cursor-pointer hover:bg-accent/60" : ""
                        }`}
                      >
                        {c > 0 ? (
                          <span className={`font-bold ${m.cell}`}>{c}</span>
                        ) : (
                          <span className="text-muted-foreground/40 font-medium">0</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-2 py-2.5 text-center font-bold text-foreground bg-muted/40 border border-border">
                    {a.total > 0 ? a.total : <span className="text-muted-foreground/40">0</span>}
                  </td>
                  <td className="px-2 py-2.5 text-center font-semibold border border-border">
                    {a.total > 0 ? (
                      <span className={a.completion_rate > 0 ? "text-success" : "text-muted-foreground"}>
                        {a.completion_rate}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Grand total footer */}
            <tr className="bg-foreground text-background border-t-2 border-border">
              <td className="sticky left-0 z-10 bg-foreground px-3 py-3 font-bold uppercase tracking-wider border border-border">
                Grand Total
              </td>
              {statuses.map((code) => {
                const c = data.columnTotals[code] ?? 0;
                return (
                  <td key={code} className="px-2 py-3 text-center font-bold border border-border">
                    {c > 0 ? c : <span className="text-background/40">0</span>}
                  </td>
                );
              })}
              <td className="px-2 py-3 text-center font-extrabold bg-brand text-brand-foreground border border-brand">
                {grandTotal}
              </td>
              <td className="px-2 py-3 text-center font-bold border border-border">
                {grandTotal > 0 ? `${teamCompletion}%` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
