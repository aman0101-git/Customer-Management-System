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
  Search,
  AlertCircle,
  Tag,
  Star
} from "lucide-react";

type Template = {
  id: number;
  project_id: number;
  project_name: string;
  trigger_event: string;
  template_code?: string;
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

// Simplified Architecture: Initial Contact vs Status Updates
const INITIAL_CODES = ["INITIAL"];
const STATUS_BASED_CODES = ["VC", "VP", "VMC", "VM", "SDOW", "NR", "VD", "BD", "LOST", "FU"];

const TEMPLATE_CODE_LABELS: Record<string, string> = {
  INITIAL: "Initial Welcome Contact",
  VC: "Visit Confirmed",
  VP: "Visit Planned",
  VMC: "Virtual Meet Confirmed",
  VM: "Virtual Meet",
  SDOW: "Site Drop / Out of Window",
  NR: "Not-Reachable",
  VD: "Visit Done",
  BD: "Booking Done",
  LOST: "Lost / Closed",
  FU: "Generic Follow-up",
};

const TEMPLATE_VARIABLES = [
  { name: "customer_name", description: "Customer's full name" },
  { name: "agent_name", description: "Agent's full name" },
  { name: "project_name", description: "Project name" },
  { name: "follow_up_date", description: "Follow-up date (if applicable)" },
  { name: "follow_up_time", description: "Follow-up time (if applicable)" },
];

export default function WhatsAppTemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [formData, setFormData] = useState({
    project_id: "",
    trigger_event: "",
    template_code: "",
    template_name: "",
    template_body: "",
    is_active: 1,
    variables_json: "{}",
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

  // Load ALL templates once, then filter on the frontend for speed
  const loadTemplates = () => {
    fetch(`${API_BASE}/api/supervisor/whatsapp/templates`, { credentials: "include" })
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
    loadTemplates();
  }, []);

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
          template_code: formData.trigger_event, // Ensure both match our code
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
      loadTemplates(); // Reload all templates
    } catch (error: any) {
      console.error("Error saving template:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      project_id: String(template.project_id),
      trigger_event: template.template_code || template.trigger_event, // Fetch exact code
      template_code: template.template_code || template.trigger_event,
      template_name: template.template_name,
      template_body: template.template_body,
      is_active: template.is_active,
      variables_json: template.variables_json || "{}",
    });
    setDrawerOpen(true);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`${API_BASE}/api/supervisor/whatsapp/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) throw new Error(await response.text());

      alert("Template deleted successfully");
      loadTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: "",
      trigger_event: "",
      template_code: "",
      template_name: "",
      template_body: "",
      is_active: 1,
      variables_json: "{}",
    });
    setEditingTemplate(null);
  };

  // --- FRONTEND FILTERING FIX ---
  // Filters instantly by search query AND selected project
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.template_body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "" || String(t.project_id) === selectedProject;
    return matchesSearch && matchesProject;
  });

  // Categorize based on the new logic
  const initialTemplates = filteredTemplates.filter(t => 
    INITIAL_CODES.includes(t.template_code || t.trigger_event || "")
  );
  
  const statusBasedTemplates = filteredTemplates.filter(t =>
    STATUS_BASED_CODES.includes(t.template_code || t.trigger_event || "")
  );

  const TemplateCard = ({ template }: { template: Template }) => {
    const displayCode = template.template_code || template.trigger_event;
    
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 text-sm">{template.template_name}</h4>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-bold text-slate-700">{displayCode}</span>
              <span>•</span>
              <span>{template.project_name || "Unknown Project"}</span>
            </div>
          </div>
          {template.is_active ? (
            <span className="px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-200">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded border border-slate-200">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-3 line-clamp-3">
          {template.template_body}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditTemplate(template)}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => handleDeleteTemplate(template.id)}
            className="flex-1 flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    );
  };

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
                Manage automated responses per project
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

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center">
              <Search className="w-5 h-5 text-slate-400 ml-3 mr-2" />
              <input
                type="text"
                placeholder="Search templates..."
                className="w-full h-10 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full h-10 outline-none text-sm text-slate-700 px-3 bg-transparent cursor-pointer"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Create Templates */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">✨ Initial Contact Templates</h3>
                <p className="text-xs text-slate-500">Sent automatically when "Create & Send" is clicked.</p>
              </div>
            </div>
            {initialTemplates.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">No initial templates set for this project.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialTemplates.map(t => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            )}
          </div>

          {/* Status-Based Templates */}
          <div className="space-y-4 pt-8 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">🏷️ Status-Based Templates</h3>
                <p className="text-xs text-slate-500">Sent when updating an existing customer's status.</p>
              </div>
            </div>
            {statusBasedTemplates.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">No status-based templates yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statusBasedTemplates.map(t => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            )}
          </div>

          {/* Variables Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900">Available Template Variables</h3>
                <p className="text-sm text-blue-800 mt-1">Use these placeholders in your template body:</p>
                <div className="mt-2 space-y-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <div key={v.name} className="text-sm text-blue-800">
                      <code className="bg-blue-100 px-2 py-1 rounded">{`{{${v.name}}}`}</code>
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

      {/* Create/Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b border-slate-200">
            <DrawerTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DrawerTitle>
            <DrawerClose />
          </DrawerHeader>

          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Project *</Label>
                <select
                  value={formData.project_id}
                  onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 cursor-pointer"
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Template Code (Trigger Event) *</Label>
                <select
                  value={formData.trigger_event}
                  onChange={e => setFormData({ ...formData, trigger_event: e.target.value })}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 cursor-pointer"
                >
                  <option value="">Select Event Code</option>
                  <optgroup label="Creation Event">
                    <option value="INITIAL">INITIAL (Initial Contact)</option>
                  </optgroup>
                  <optgroup label="Status Updates">
                    {STATUS_BASED_CODES.map(code => (
                      <option key={code} value={code}>
                        {code} ({TEMPLATE_CODE_LABELS[code]})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={e => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Nanded City - Visit Confirmed"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Template Body *</Label>
              <Textarea
                value={formData.template_body}
                onChange={e => setFormData({ ...formData, template_body: e.target.value })}
                placeholder="Hi {{customer_name}}, your site visit is scheduled for..."
                rows={5}
                className="mt-2"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.is_active === 1}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 cursor-pointer accent-green-600"
              />
              <label htmlFor="is-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                Active Template
              </label>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
              >
                {editingTemplate ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}