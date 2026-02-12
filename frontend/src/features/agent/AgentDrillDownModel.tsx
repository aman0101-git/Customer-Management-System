import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  title: string;
  data: any[];
  loading: boolean;
}

export default function AgentDrillDownModal({ isOpen, onClose, title, data, loading }: DrillDownModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize text-slate-800 border-b pb-2">
            {title} Details
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-500 italic">No records found.</td></tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{row.customer_name}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{row.contact}</td>
                      <td className="p-3">
                        <span className="text-[10px] uppercase bg-slate-100 text-slate-600 rounded px-2 py-1 font-bold">
                          {row.project_name}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-xs">
                        {row.done_date 
                          ? <span className="text-emerald-600 font-semibold">{format(new Date(row.done_date), "dd/MM/yyyy")} (Done)</span>
                          : row.follow_up_date 
                            ? <span>{format(new Date(row.follow_up_date), "dd/MM/yyyy")} <span className="text-slate-400">@ {row.follow_up_time}</span></span>
                            : "-"}
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