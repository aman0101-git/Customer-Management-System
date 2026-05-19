import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Loader2, Download } from "lucide-react";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  title: string;
  data: any[];
  loading: boolean;
}

export default function DrillDownModal({ isOpen, onClose, title, data, loading }: DrillDownModalProps) {

  // ---------------- CSV EXPORT FUNCTION ----------------
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    // NEW: Added "Lead Type" to headers
    const headers = [
      "Customer",
      "Contact",
      "Agent",
      "Project",
      "Status",
      "Lead Type", 
      "Date"
    ];

    // Escape function for commas/quotes (VERY IMPORTANT for Excel)
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    };

    const rows = data.map((row) => {
      let dateText = "-";

      if (row.done_date) {
        dateText = `${format(new Date(row.done_date), "dd/MM/yyyy")} (Done)`;
      } else if (row.follow_up_date) {
        dateText = `${format(new Date(row.follow_up_date), "dd/MM/yyyy")} ${row.follow_up_time}`;
      }

      return [
        escapeCSV(row.customer_name || "-"),
        escapeCSV(row.contact || "-"),
        escapeCSV(row.agent_first_name && row.agent_last_name 
          ? `${row.agent_first_name} ${row.agent_last_name}` 
          : row.agent_first_name || row.agent_name || "-"),
        escapeCSV(row.project_name || "-"),
        escapeCSV(row.status_code ? row.status_code.replace(/-/g, " ").toUpperCase() : "-"),
        
        // NEW: Added Lead Type to the export row
        escapeCSV(row.pipeline_lead_type && row.pipeline_lead_type !== 'N/A' ? row.pipeline_lead_type : "-"),
        
        escapeCSV(dateText)
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    // BOM fixes Excel UTF-8 issue (names/₹/special characters)
    const BOM = "\uFEFF";

    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;"
    });

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
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
          <DialogTitle className="capitalize text-slate-800">
            {title} Details
          </DialogTitle>

          {/* EXPORT CSV BUTTON */}
          {!loading && data.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors mr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Export to Excel (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden border-slate-200 mt-2">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3 whitespace-nowrap">Customer</th>
                  <th className="p-3 whitespace-nowrap">Contact</th>
                  <th className="p-3 whitespace-nowrap">Agent</th>
                  <th className="p-3 whitespace-nowrap">Project</th>
                  <th className="p-3 whitespace-nowrap">Status</th>
                  
                  {/* NEW: Table Header */}
                  <th className="p-3 whitespace-nowrap text-center">Lead Type</th>
                  
                  <th className="p-3 whitespace-nowrap">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-800 whitespace-nowrap">
                        {row.customer_name}
                      </td>

                      <td className="p-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                        {row.contact}
                      </td>

                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {row.agent_first_name && row.agent_last_name 
                          ? `${row.agent_first_name} ${row.agent_last_name}` 
                          : row.agent_first_name || row.agent_name || "-"}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] uppercase bg-slate-100 text-slate-600 rounded px-2 py-1 font-bold">
                          {row.project_name}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          {row.status_code?.replace(/-/g, " ")}
                        </span>
                      </td>

                      {/* NEW: Lead Type Table Cell */}
                      <td className="p-3 whitespace-nowrap text-center">
                        {row.pipeline_lead_type && row.pipeline_lead_type !== 'N/A' ? (
                          <span className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            row.pipeline_lead_type === 'Fresh'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {row.pipeline_lead_type}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-medium">-</span>
                        )}
                      </td>

                      <td className="p-3 text-slate-600 text-xs whitespace-nowrap">
                        {row.done_date ? (
                          <span className="text-emerald-600 font-semibold">
                            {format(new Date(row.done_date), "dd/MM/yyyy")} (Done)
                          </span>
                        ) : row.follow_up_date ? (
                          <span>
                            {format(new Date(row.follow_up_date), "dd/MM/yyyy")}{" "}
                            <span className="text-slate-400">@ {row.follow_up_time}</span>
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