// ============================================================================
// PHASE 3 — DrillDownModal (supervisor)
// ----------------------------------------------------------------------------
// CSV export with BOM preserved verbatim. Visual layer fully tokenized.
// Lead Type badge keeps semantic Fresh / Repeated styling but via tokens.
// ============================================================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatISTDate } from "@/lib/formatIST";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  title: string;
  data: any[];
  loading: boolean;
}

export default function DrillDownModal({ isOpen, onClose, title, data, loading }: DrillDownModalProps) {

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    const headers = ["Customer", "Contact", "Agent", "Project", "Status", "Lead Type", "Date"];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const rows = data.map((row) => {
      let dateText = "-";
      if (row.done_date) {
        dateText = `${formatISTDate(row.done_date)} (Done)`;
      } else if (row.follow_up_date) {
        dateText = `${formatISTDate(row.follow_up_date)} ${String(row.follow_up_time ?? "").slice(0,5)}`;
      }

      return [
        escapeCSV(row.customer_name || "-"),
        escapeCSV(row.contact || "-"),
        escapeCSV(row.agent_first_name && row.agent_last_name
          ? `${row.agent_first_name} ${row.agent_last_name}`
          : row.agent_first_name || row.agent_name || "-"),
        escapeCSV(row.project_name || "-"),
        escapeCSV(row.status_code ? row.status_code.replace(/-/g, " ").toUpperCase() : "-"),
        escapeCSV(row.pipeline_lead_type && row.pipeline_lead_type !== "N/A" ? row.pipeline_lead_type : "-"),
        escapeCSV(dateText),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const BOM = "﻿";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${title.replace(/\s+/g, "_")}_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-2 pr-10">
          <DialogTitle className="capitalize text-foreground">
            {title} Details
          </DialogTitle>

          {!loading && data.length > 0 && (
            <Button
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5"
              title="Export to Excel (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden mt-2">
            <table className="w-full text-sm text-left tabular-nums-tracking">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 whitespace-nowrap">Customer</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Contact</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Agent</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Project</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 whitespace-nowrap text-center">Lead Type</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground italic">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-accent/40 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                        {row.customer_name}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {row.contact}
                      </td>
                      <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                        {row.agent_first_name && row.agent_last_name
                          ? `${row.agent_first_name} ${row.agent_last_name}`
                          : row.agent_first_name || row.agent_name || "-"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] uppercase bg-muted text-muted-foreground rounded px-2 py-1 font-bold">
                          {row.project_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                          {row.status_code?.replace(/-/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-center">
                        {row.pipeline_lead_type && row.pipeline_lead_type !== "N/A" ? (
                          <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            row.pipeline_lead_type === "Fresh"
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-warning/15 text-warning border-warning/30"
                          }`}>
                            {row.pipeline_lead_type}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 font-medium">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-foreground text-xs whitespace-nowrap">
                        {row.done_date ? (
                          <span className="text-success font-semibold">
                            {formatISTDate(row.done_date)} (Done)
                          </span>
                        ) : row.follow_up_date ? (
                          <span>
                            {formatISTDate(row.follow_up_date)}{" "}
                            <span className="text-muted-foreground">@ {row.follow_up_time}</span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
