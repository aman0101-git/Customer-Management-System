import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/ui/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { Loader2, Filter, Calendar, User, MessageCircle } from 'lucide-react';

interface AuditLogEntry {
  id: number;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  status: string;
  first_name: string;
  last_name: string;
  customer_name: string;
  phone: string;
  project_name: string;
  template_code?: string;
  delivery_mode: string;
  message_preview: string;
}

export default function SupervisorWhatsAppAudit() {
  const { user, loading: authLoading } = useAuth();
  const [auditData, setAuditData] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filterAgent, setFilterAgent] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [agents, setAgents] = useState<any[]>([]);

  // Load agents on mount
  useEffect(() => {
    if (user) {
      fetchAgents();
      fetchAuditLog();
    }
  }, [user]);

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/users', {
        withCredentials: true,
      });
      if (res.data && Array.isArray(res.data)) {
        setAgents(res.data.filter((u: any) => u.role === 'AGENT'));
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAgent) params.append('agentId', filterAgent);
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);

      const res = await axios.get(
        `/api/supervisor/whatsapp/audit?${params.toString()}`,
        { withCredentials: true }
      );

      if (res.data && res.data.data) {
        setAuditData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    fetchAuditLog();
  };

  const handleClearFilters = () => {
    setFilterAgent('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatMessagePreview = (message: string) => {
    return message.length > 100 ? message.substring(0, 100) + '...' : message;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800';
      case 'DELIVERED':
        return 'bg-blue-100 text-blue-800';
      case 'READ':
        return 'bg-indigo-100 text-indigo-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-slate-900">WhatsApp Audit Log</h1>
            </div>
            <p className="text-slate-600">Track all WhatsApp messages sent by your agents</p>
          </div>

          {/* Filters Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Agent Filter */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <User className="w-4 h-4" /> Agent
                </Label>
                <select
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> From
                </Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="px-3 py-2 text-sm"
                />
              </div>

              {/* End Date Filter */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> To
                </Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="px-3 py-2 text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleFilterApply}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Apply Filter
                </Button>
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="px-4 py-2 rounded-lg"
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{auditData.length}</span> records
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : auditData.length === 0 ? (
              <div className="flex justify-center items-center py-12 text-slate-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No records found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Date/Time</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Agent</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Customer</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Project</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Template</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Message</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Delivery Mode</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.map((entry, idx) => (
                      <tr key={entry.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-3 text-slate-700">{formatDateTime(entry.sent_at)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{entry.first_name} {entry.last_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{entry.customer_name}</div>
                          <div className="text-xs text-slate-500">{entry.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{entry.project_name}</td>
                        <td className="px-4 py-3">
                          {entry.template_code ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {entry.template_code}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">
                          <div className="truncate text-xs" title={entry.message_preview}>
                            {formatMessagePreview(entry.message_preview)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{entry.delivery_mode}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(entry.status)}`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
