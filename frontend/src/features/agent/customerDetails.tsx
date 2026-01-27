import { useEffect, useState } from "react";
import { API_BASE } from "@/apiBase";

export default function CustomerDetails() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/agent/customers`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load customers");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!customers.length) return <div>No customers found.</div>;

  return (
    <table className="min-w-full border text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">Owner</th>
          <th className="p-2 border">Project</th>
          <th className="p-2 border">Name</th>
          <th className="p-2 border">Contact</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">Final Status</th>
          <th className="p-2 border">Created At</th>
          <th className="p-2 border">Updated At</th>
          <th className="p-2 border">Action</th>
        </tr>
      </thead>
      <tbody>
        {customers.map(c => (
          <tr key={c.id} className="border-b">
            <td className="p-2 border">{c.owner || "-"}</td>
            <td className="p-2 border">{c.project || "-"}</td>
            <td className="p-2 border">{c.name}</td>
            <td className="p-2 border">{c.contact}</td>
            <td className="p-2 border">{c.status_code}</td>
            <td className="p-2 border">{c.final_status || "-"}</td>
            <td className="p-2 border">{c.created_at ? new Date(c.created_at).toLocaleString() : "-"}</td>
            <td className="p-2 border">{c.updated_at ? new Date(c.updated_at).toLocaleString() : "-"}</td>
            <td className="p-2 border">
              <a
                href={`/agent/customers/resolve?edit=${c.id}`}
                className="text-blue-600 hover:underline mr-2"
                title="Edit"
              >Edit</a>
              {['visit-done', 'booking-done'].includes(c.status_code) && c.final_status !== 'COMPLETED' && (
                <button
                  className="text-green-600 hover:underline"
                  title="Complete"
                  onClick={async () => {
                    if (!window.confirm('Mark as completed?')) return;
                    await fetch(`${API_BASE}/agent/customers/${c.id}/complete`, {
                      method: 'PATCH',
                      credentials: 'include',
                    });
                    setLoading(true);
                    fetch(`${API_BASE}/agent/customers`, { credentials: "include" })
                      .then(res => res.json())
                      .then(data => {
                        setCustomers(Array.isArray(data) ? data : []);
                        setLoading(false);
                      })
                      .catch(() => {
                        setError("Failed to load customers");
                        setLoading(false);
                      });
                  }}
                >Complete</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
