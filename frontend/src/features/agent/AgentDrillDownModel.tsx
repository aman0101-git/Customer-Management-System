// PHASE 2 — AgentDrillDownModal
// Tokenized surfaces and text colors. Modal contract (props, render shape)
// unchanged. Empty-state row now uses the EmptyState design helper feel
// (kept inline as a single <tr> so we don't break colspan layout).

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  title: string;
  data: any[];
  loading: boolean;
}

export default function AgentDrillDownModal({
  isOpen,
  onClose,
  title,
  data,
  loading,
}: DrillDownModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize text-foreground border-b border-border pb-2">
            {title} Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left tabular-nums-tracking">
              <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Contact</th>
                  <th className="px-3 py-2.5">Project</th>
                  <th className="px-3 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground italic"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-accent/40 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {row.customer_name}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                        {row.contact}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] uppercase bg-muted text-muted-foreground rounded px-2 py-1 font-bold">
                          {row.project_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-foreground text-xs">
                        {row.done_date ? (
                          <span className="text-success font-semibold">
                            {format(new Date(row.done_date), "dd/MM/yyyy")} (Done)
                          </span>
                        ) : row.follow_up_date ? (
                          <span>
                            {format(new Date(row.follow_up_date), "dd/MM/yyyy")}{" "}
                            <span className="text-muted-foreground">
                              @ {row.follow_up_time}
                            </span>
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
