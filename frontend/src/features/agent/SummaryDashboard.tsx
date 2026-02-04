import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/* ---------------- TABS ---------------- */
const Tabs = ({ active, setActive, labels }: any) => (
  <div className="flex space-x-2 mb-6 border-b">
    {labels.map((label: string, idx: number) => (
      <button
        key={idx}
        onClick={() => setActive(idx)}
        className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
          active === idx
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

export default function SummaryDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);

  // Filters
  const [selectedProject, setSelectedProject] = useState("all");
  const [period, setPeriod] = useState("This Week");
  const [pipelineWeek, setPipelineWeek] = useState("This Week");

  // Data (IMPORTANT: OBJECTS, NOT ARRAYS)
  const [sec1Data, setSec1Data] = useState<Record<string, number>>({});
  const [sec2Data, setSec2Data] = useState<any[]>([]);
  const [sec3Data, setSec3Data] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  /* ---------------- DATE LOGIC ---------------- */
  const getDatesFromPeriod = (p: string) => {
    const now = new Date();
    let start = now;
    let end = now;

    if (p === "Today") {
      start = now;
      end = now;
    } else if (p === "Yesterday") {
      start = subDays(now, 1);
      end = subDays(now, 1);
    } else if (p === "This Week") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (p === "This Month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (p === "Past Week") {
      const prev = subWeeks(now, 1);
      start = startOfWeek(prev, { weekStartsOn: 1 });
      end = endOfWeek(prev, { weekStartsOn: 1 });
    } else if (p === "Next Week") {
      const next = addWeeks(now, 1);
      start = startOfWeek(next, { weekStartsOn: 1 });
      end = endOfWeek(next, { weekStartsOn: 1 });
    }

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  };

  /* ---------------- FETCH PROJECTS ---------------- */
  const fetchProjects = async () => {
    try {
      const res = await axios.get(
        `/api/agent/customers/summary-dashboard?section=projects&_ts=${Date.now()}`
      );
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch projects", e);
      setProjects([]);
    }
  };

  /* ---------------- FETCH DASHBOARD DATA ---------------- */
  const fetchData = async () => {
    setLoading(true);
    try {
      const ts = Date.now();
      if (activeTab === 0) {
        const { startDate, endDate } = getDatesFromPeriod(period);
        const res = await axios.get("/api/agent/customers/summary-dashboard", {
          params: {
            section: "1",
            projectId: selectedProject,
            startDate,
            endDate,
            _ts: ts,
          },
        });
        setSec1Data(res.data || {});
      }

      if (activeTab === 1) {
        const { startDate, endDate } = getDatesFromPeriod(pipelineWeek);
        const res = await axios.get("/api/agent/customers/summary-dashboard", {
          params: { section: "2", startDate, endDate, _ts: ts },
        });
        setSec2Data(Array.isArray(res.data) ? res.data : []);
      }

      if (activeTab === 2) {
        const { startDate, endDate } = getDatesFromPeriod(period);
        const res = await axios.get("/api/agent/customers/summary-dashboard", {
          params: {
            section: "3",
            projectId: selectedProject,
            startDate,
            endDate,
            _ts: ts,
          },
        });
        setSec3Data(res.data || {});
      }
    } catch (err) {
      console.error("Dashboard fetch failed", err);
      setSec1Data({});
      setSec2Data([]);
      setSec3Data({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [activeTab, selectedProject, period, pipelineWeek, user]);

  /* ---------------- HELPERS ---------------- */
  const getCount = (data: Record<string, number>, code: string) =>
    data?.[code] ?? 0;

  /* ---------------- SECTION 1 ---------------- */
  const renderSection1 = () => (
    <div className="space-y-6">
      <div className="flex gap-4 mb-4 bg-white p-4 rounded shadow-sm items-center">
        <select
          className="border p-2 rounded"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>Today</option>
          <option>Yesterday</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visit Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {getCount(sec1Data, "visit-confirmed")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visit Done</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {getCount(sec1Data, "visit-done")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Done</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {getCount(sec1Data, "booking-done")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  /* ---------------- SECTION 2 ---------------- */
  const renderSection2 = () => {
    const statuses = [
      { label: "Visit Confirmed", code: "visit-confirmed" },
      { label: "Visit Proposed", code: "visit-proposed" },
      { label: "Virtual Meet", code: "virtual-meet-confirmed" },
    ];

    const days = [
      { label: "Mon", sql: 2 },
      { label: "Tue", sql: 3 },
      { label: "Wed", sql: 4 },
      { label: "Thu", sql: 5 },
      { label: "Fri", sql: 6 },
      { label: "Sat", sql: 7 },
      { label: "Sun", sql: 1 },
    ];

    const getDayCount = (status: string, day: number) =>
      sec2Data.find(
        (d) => d.status_code === status && d.day_num === day
      )?.count || 0;

    return (
      <div className="space-y-6">
        <div className="flex gap-4 mb-4 bg-white p-4 rounded shadow-sm items-center">
          <select
            className="border p-2 rounded"
            value={pipelineWeek}
            onChange={(e) => setPipelineWeek(e.target.value)}
          >
            <option>Past Week</option>
            <option>This Week</option>
            <option>Next Week</option>
          </select>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Status</th>
                {days.map((d) => (
                  <th key={d.label} className="p-3 text-center">
                    {d.label}
                  </th>
                ))}
                <th className="p-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => {
                let total = 0;
                return (
                  <tr key={s.code}>
                    <td className="p-3 font-medium">{s.label}</td>
                    {days.map((d) => {
                      const c = getDayCount(s.code, d.sql);
                      total += c;
                      return (
                        <td key={d.label} className="p-3 text-center">
                          {c || "-"}
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-bold">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ---------------- SECTION 3 ---------------- */
  const renderSection3 = () => {
    const entries = Object.entries(sec3Data);
    const total = entries.reduce((s, [, c]) => s + c, 0);

    return (
      <div className="space-y-6">
        <div className="flex gap-4 mb-4 bg-white p-4 rounded shadow-sm items-center">
          <select
            className="border p-2 rounded"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>

        <div className="bg-white rounded shadow p-4">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([status, count]) => (
                <tr key={status}>
                  <td className="p-3 capitalize">
                    {status.replace(/-/g, " ")}
                  </td>
                  <td className="p-3 text-right font-bold">{count}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-right">{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (authLoading) return <div>Loading session...</div>;
  if (!user) return <div>Session expired. Please login.</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Summary Dashboard</h1>

      <Tabs
        active={activeTab}
        setActive={setActiveTab}
        labels={["Visits & Booking", "Weekly Pipeline", "Status Counts"]}
      />

      {loading ? (
        <div className="p-10 text-center text-gray-500">Loading data…</div>
      ) : (
        <>
          {activeTab === 0 && renderSection1()}
          {activeTab === 1 && renderSection2()}
          {activeTab === 2 && renderSection3()}
        </>
      )}
    </div>
  );
}
