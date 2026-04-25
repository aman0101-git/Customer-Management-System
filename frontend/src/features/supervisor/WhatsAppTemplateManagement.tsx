import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import {
  MessageCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Search,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";

type Template = {
  id: number;
  project_id: number;
  project_name: string;
  trigger_event: "INITIAL" | "REMINDER_D3" | "REMINDER_D1" | "FOLLOWUP_DAY";
  template_name: string;
  template_body: string;
  language_code: string;
  variables_json: string;
  is_active: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
};

type Project = {
  id: number;
  name: string;
};

const TRIGGER_EVENTS = [
  { value: "INITIAL", label: "Initial Contact" },
  { value: "REMINDER_D3", label: "Reminder (Day 3)" },
  { value: "REMINDER_D1", label: "Reminder (Day 1)" },
  { value: "FOLLOWUP_DAY", label: "Follow-up Day" },
];

const TEMPLATE_VARIABLES = [
  { name: "customer_name", description: "Customer's full name" },
  { name: "agent_name", description: "Agent's full name" },
  { name: "project_name", description: "Project name" },
  { name: "follow_up_date", description: "Follow-up date" },
  { name: "follow_up_time", description: "Follow-up time" },
];

export default function WhatsAppTemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewPanelOpen, setPreviewPanelOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    trigger_event: "",
    template_name: "",
    template_body: "",
    is_active: 1,
    variables_json: "{}",
  });

  // Preview state
  const [previewData, setPreviewData] = useState({
    customer_name: "John Doe",
    agent_name: "Agent Smith",
    project_name: "Sunset Heights",
    follow_up_date: "15/03/2023",
    follow_up_time: "10:30:00",
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Load projects
  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          setProjects(data.data || []);
        }
      })
      .catch(err => console.error("Failed to load projects:", err));
  }, []);

  // Load templates
  const loadTemplates = (projectId?: string) => {
    const url = projectId
      ? `${API_BASE}/api/supervisor/whatsapp/templates?projectId=${projectId}`
      : `${API_BASE}/api/supervisor/whatsapp/templates`;

    fetch(url, { credentials: "include" })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => setTemplates(data.data || []))
      .catch(err => {
        console.error("Failed to load templates:", err);
        alert("Failed to load templates");
      });
  };

  useEffect(() => {
    loadTemplates(selectedProject);
  }, [selectedProject]);

  // Handle create/update
  const handleSaveTemplate = async () => {
    if (!formData.project_id || !formData.trigger_event || !formData.template_body) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const url = editingTemplate
        ? `${API_BASE}/api/supervisor/whatsapp/templates/${editingTemplate.id}`
        : `${API_BASE}/api/supervisor/whatsapp/templates`;

      const method = editingTemplate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_id: Number(formData.project_id),
          trigger_event: formData.trigger_event,
          template_name: formData.template_name,
          template_body: formData.template_body,
          language_code: "en",
          variables_json: formData.variables_json,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      alert(editingTemplate ? "Template updated successfully" : "Template created successfully");
      setDrawerOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates(selectedProject);
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Handle edit
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      project_id: String(template.project_id),
      trigger_event: template.trigger_event,
      template_name: template.template_name,
      template_body: template.template_body,
      is_active: template.is_active,
      variables_json: template.variables_json || "{}",
    });
    setDrawerOpen(true);
  };

  // Handle delete
  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/supervisor/whatsapp/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error(await response.text());

      alert("Template deleted successfully");
      loadTemplates(selectedProject);
    } catch (error: any) {
      console.error("Error deleting template:", error);
      alert(`Error: ${error.message}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      project_id: "",
      trigger_event: "",
      template_name: "",
      template_body: "",
      is_active: 1,
      variables_json: "{}",
    });
    setEditingTemplate(null);
  };

  // Render template preview
  const renderTemplate = (body: string): string => {
    let rendered = body;
    rendered = rendered.replace(/{{customer_name}}/g, previewData.customer_name);
    rendered = rendered.replace(/{{agent_name}}/g, previewData.agent_name);
    rendered = rendered.replace(/{{project_name}}/g, previewData.project_name);
    return rendered;
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.template_body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell sidebar={null}>
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg shadow-lg shadow-green-200">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                WhatsApp Message Templates
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1 ml-1">
                Create and manage project-wise WhatsApp message templates with variable support.
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-200 active:scale-95"
              onClick={() => {
                resetForm();
                setDrawerOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          {/* Controls & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <div className="pl-3 pr-2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Search templates by name or content..."
                className="w-full h-10 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full h-10 outline-none text-sm text-slate-700 px-3 bg-transparent"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-green-600">{filteredTemplates.length}</span>
            </div>
          </div>

          {/* Templates Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Template Name</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Project</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Event</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-24">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <MessageCircle className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-slate-900 font-bold">No templates found</h3>
                          <p className="text-slate-400 text-sm mt-1">Create your first template to get started.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map(template => (
                      <tr key={template.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{template.template_name}</p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.template_body}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700">
                            {template.project_name ||
                              projects.find(p => p.id === template.project_id)?.name ||
                              "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Zap className="w-3 h-3" />
                            {TRIGGER_EVENTS.find(e => e.value === template.trigger_event)?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
                              template.is_active
                                ? "bg-green-50 text-green-700 border-green-100"
                                : "bg-slate-50 text-slate-700 border-slate-100"
                            }`}
                          >
                            {template.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              "Inactive"
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setFormData({
                                  project_id: String(template.project_id),
                                  trigger_event: template.trigger_event,
                                  template_name: template.template_name,
                                  template_body: template.template_body,
                                  is_active: template.is_active,
                                  variables_json: template.variables_json,
                                });
                                setPreviewPanelOpen(true);
                              }}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Template Variables Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900">Available Template Variables</h3>
                <p className="text-sm text-blue-800 mt-1">Use these placeholders in your template body:</p>
                <div className="mt-2 space-y-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <div key={v.name} className="text-sm text-blue-800">
                      <code className="bg-blue-100 px-2 py-1 rounded">
                        {`{{${v.name}}}`}
                      </code>
                      {" - "}
                      <span className="text-blue-700">{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Template Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b border-slate-200">
            <DrawerTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DrawerTitle>
            <DrawerClose />
          </DrawerHeader>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Project & Trigger Event */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Project *</Label>
                <select
                  value={formData.project_id}
                  onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Trigger Event *</Label>
                <select
                  value={formData.trigger_event}
                  onChange={e => setFormData({ ...formData, trigger_event: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Select event</option>
                  {TRIGGER_EVENTS.map(e => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Name */}
            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={e => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Initial Welcome Message"
                className="mt-2"
              />
            </div>

            {/* Template Body */}
            <div>
              <Label>Message Body *</Label>
              <Textarea
                value={formData.template_body}
                onChange={e => setFormData({ ...formData, template_body: e.target.value })}
                placeholder="Enter your message body. Use {{customer_name}}, {{agent_name}}, {{project_name}} for variables."
                className="mt-2 min-h-[120px]"
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
              <Label>Active Template</Label>
            </div>

            {/* Save Button */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                {editingTemplate ? "Update" : "Create"} Template
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Preview Panel */}
      <Drawer open={previewPanelOpen} onOpenChange={setPreviewPanelOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b border-slate-200">
            <DrawerTitle>Template Preview</DrawerTitle>
            <DrawerClose />
          </DrawerHeader>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preview Settings */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Sample Data</h3>
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={previewData.customer_name}
                    onChange={e => setPreviewData({ ...previewData, customer_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Agent Name</Label>
                  <Input
                    value={previewData.agent_name}
                    onChange={e => setPreviewData({ ...previewData, agent_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Project Name</Label>
                  <Input
                    value={previewData.project_name}
                    onChange={e => setPreviewData({ ...previewData, project_name: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900">Live Preview</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 min-h-[200px] text-sm text-slate-800 whitespace-pre-wrap">
                  {renderTemplate(formData.template_body)}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={() => setPreviewPanelOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-sm font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
