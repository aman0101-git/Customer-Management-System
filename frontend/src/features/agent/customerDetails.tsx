import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/apiBase";

export default function CustomerDetails() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🔒 Status guards (explicit, readable, auditable)
  const NON_EDITABLE_STATUSES = ["visit-done", "booking-done", "lost"];
  const COMPLETABLE_STATUSES = ["visit-done", "booking-done", "lost"];

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/api/agent/customers`, {
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to fetch customers");
      }

      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!customers.length) return <div>No customers found.</div>;

  // Helper to safely display values or '-'
  const safe = (val: any) =>
    val === null || val === undefined || val === "" ? "-" : val;

  return (
    <table className="min-w-full border text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">Name</th>
          <th className="p-2 border">Contact</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">Final Status</th>
          <th className="p-2 border">Assigned At</th>
          <th className="p-2 border">Action</th>
        </tr>
      </thead>
      <tbody>
        {customers.map((c) => {
          const isCompleted = c.final_status === "COMPLETED";
          const canEdit =
            !NON_EDITABLE_STATUSES.includes(c.status_code) && !isCompleted;
          const canComplete =
            COMPLETABLE_STATUSES.includes(c.status_code) && !isCompleted;

          return (
            <tr key={c.id} className="border-b">
              <td className="p-2 border">{safe(c.name)}</td>
              <td className="p-2 border">{safe(c.contact)}</td>
              <td className="p-2 border">{safe(c.status_code)}</td>
              <td className="p-2 border">{safe(c.final_status)}</td>
              <td className="p-2 border">
                {c.assigned_at
                  ? new Date(c.assigned_at).toLocaleString()
                  : "-"}
              </td>
              <td className="p-2 border space-x-2">
                {/* EDIT BUTTON */}
                {canEdit && (
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded border border-blue-600 text-blue-600 hover:bg-blue-50"
                    onClick={() =>
                      navigate(`/agent/customers/resolve?edit=${c.id}`)
                    }
                  >
                    Edit
                  </button>
                )}

                {/* COMPLETE BUTTON (disabled when already completed) */}
                {COMPLETABLE_STATUSES.includes(c.status_code) && (
                  <button
                    type="button"
                    disabled={!canComplete}
                    className={`px-3 py-1 text-sm rounded border
                      ${
                        canComplete
                          ? "border-green-600 text-green-600 hover:bg-green-50"
                          : "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                      }`}
                    onClick={async () => {
                      if (!canComplete) return;
                      if (!window.confirm("Mark as completed?")) return;

                      const res = await fetch(
                        `${API_BASE}/api/agent/customers/${c.id}/complete`,
                        {
                          method: "PATCH",
                          credentials: "include",
                        }
                      );

                      if (res.ok) {
                        loadCustomers();
                      } else {
                        alert("Failed to complete customer");
                      }
                    }}
                  >
                    Complete
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
