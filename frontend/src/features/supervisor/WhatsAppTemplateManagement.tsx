// ============================================================================
// PHASE 3 — WhatsAppTemplateManagement
// ============================================================================
// All template CRUD logic preserved. alert() calls swapped for sonner toasts to
// match the rest of the AMS (the surrounding pages already use sonner).
// Visual layer fully tokenized: PageHeader, SectionCard groupings, NativeSelect
// in the filter and form, design-system buttons, semantic Active/Inactive chips,
// EmptyState helpers when sections are empty.
// ============================================================================

import { useEffect, useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import {

  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  Tag,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/system/PageHeader";
import EmptyState from "@/components/system/EmptyState";
import NativeSelect from "@/components/system/NativeSelect";
import { toast } from "sonner";

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

type Project = { id: number; name: string };

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

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
        else setProjects(data.data || []);
      })
      .catch(err => console.error("Failed to load projects:", err));
  }, []);

  const loadTemplates = () => {
    fetch(`${API_BASE}/api/supervisor/whatsapp/templates`, { credentials: "include" })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => setTemplates(data.data || []))
      .catch(err => {
        console.error("Failed to load templates:", err);
        toast.error("Failed to load templates");
      });
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleSaveTemplate = async () => {
    if (!formData.project_id || !formData.trigger_event || !formData.template_body) {
      toast.error("Please fill in all required fields");
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
          template_code: formData.trigger_event,
          template_name: formData.template_name,
          template_body: formData.template_body,
          language_code: "en",
          variables_json: formData.variables_json,
          is_active: formData.is_active,
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      toast.success(editingTemplate ? "Template updated successfully" : "Template created successfully");
      setDrawerOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      project_id: String(template.project_id),
      trigger_event: template.template_code || template.trigger_event,
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
      toast.success("Template deleted successfully");
      loadTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error(`Error: ${error.message}`);
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

  const filteredTemplates = templates.filter(t => {
    const matchesSearch =
      t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.template_body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "" || String(t.project_id) === selectedProject;
    return matchesSearch && matchesProject;
  });

  const initialTemplates = filteredTemplates.filter(t =>
    INITIAL_CODES.includes(t.template_code || t.trigger_event || "")
  );
  const statusBasedTemplates = filteredTemplates.filter(t =>
    STATUS_BASED_CODES.includes(t.template_code || t.trigger_event || "")
  );

  const TemplateCard = ({ template }: { template: Template }) => {
    const displayCode = template.template_code || template.trigger_event;
    return (
      <div className="bg-card text-card-foreground border border-border rounded-xl p-4 hover:shadow-elevation-2 transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground text-sm">{template.template_name}</h4>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-bold text-foreground">{displayCode}</span>
              <span>•</span>
              <span>{template.project_name || "Unknown Project"}</span>
            </div>
          </div>
          {template.is_active ? (
            <span className="px-2 py-1 bg-success/15 text-success text-[10px] font-bold rounded border border-success/30">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 bg-muted text-muted-foreground text-[10px] font-bold rounded border border-border">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded mb-3 line-clamp-3">
          {template.template_body}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditTemplate(template)}
            className="flex-1 gap-1 text-info border-info/30 hover:bg-info/10"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeleteTemplate(template.id)}
            className="flex-1 gap-1 text-danger border-danger/30 hover:bg-danger/10"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AppShell sidebar={null}>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          eyebrow="WhatsApp"
          title="Message Templates"
          description="Manage automated responses per project."
          actions={
            <Button onClick={() => { resetForm(); setDrawerOpen(true); }} className="gap-2 bg-success text-success-foreground hover:bg-success/90" size="lg">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          }
        />

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-card text-card-foreground p-1.5 rounded-xl border border-border shadow-elevation-1 flex items-center">
            <Search className="w-5 h-5 text-muted-foreground ml-3 mr-2" />
            <input
              type="text"
              placeholder="Search templates..."
              className="w-full h-10 outline-none text-sm text-foreground placeholder:text-muted-foreground bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <NativeSelect
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            wrapperClassName="w-full"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </div>

        {/* Initial Templates */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/15 text-info rounded-lg">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Initial Contact Templates</h3>
              <p className="text-xs text-muted-foreground">Sent automatically when "Create &amp; Send" is clicked.</p>
            </div>
          </div>
          {initialTemplates.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl">
              <EmptyState
                icon={Star}
                title="No initial templates set"
                description="Create a welcome template so newly added customers get an automatic outbound."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialTemplates.map(t => <TemplateCard key={t.id} template={t} />)}
            </div>
          )}
        </div>

        {/* Status Templates */}
        <div className="space-y-4 pt-8 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-4/15 text-chart-4 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Status-Based Templates</h3>
              <p className="text-xs text-muted-foreground">Sent when updating an existing customer's status.</p>
            </div>
          </div>
          {statusBasedTemplates.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl">
              <EmptyState
                icon={Tag}
                title="No status-based templates yet"
                description="Create per-status messages so agents can update + notify in one click."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusBasedTemplates.map(t => <TemplateCard key={t.id} template={t} />)}
            </div>
          )}
        </div>

        {/* Variables Reference */}
        <div className="bg-info/10 border border-info/30 rounded-xl p-4 mt-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-info mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-info">Available Template Variables</h3>
              <p className="text-sm text-info/80 mt-1">Use these placeholders in your template body:</p>
              <div className="mt-2 space-y-1">
                {TEMPLATE_VARIABLES.map(v => (
                  <div key={v.name} className="text-sm text-info">
                    <code className="bg-info/15 px-2 py-1 rounded">{`{{${v.name}}}`}</code>
                    {" - "}
                    <span className="text-info/80">{v.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DrawerTitle>
            <DrawerClose asChild>
              <button
                aria-label="Close"
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Project *</Label>
                <NativeSelect
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  wrapperClassName="w-full mt-2"
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <Label>Template Code (Trigger Event) *</Label>
                <NativeSelect
                  value={formData.trigger_event}
                  onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                  wrapperClassName="w-full mt-2"
                >
                  <option value="">Select Event Code</option>
                  <optgroup label="Creation Event">
                    <option value="INITIAL">INITIAL (Initial Contact)</option>
                  </optgroup>
                  <optgroup label="Status Updates">
                    {STATUS_BASED_CODES.map(code => (
                      <option key={code} value={code}>{code} ({TEMPLATE_CODE_LABELS[code]})</option>
                    ))}
                  </optgroup>
                </NativeSelect>
              </div>
            </div>

            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Nanded City - Visit Confirmed"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Template Body *</Label>
              <Textarea
                value={formData.template_body}
                onChange={(e) => setFormData({ ...formData, template_body: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 cursor-pointer accent-success"
              />
              <label htmlFor="is-active" className="text-sm font-medium text-foreground cursor-pointer">
                Active Template
              </label>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button onClick={() => setDrawerOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
                {editingTemplate ? "Update Template" : "Create Template"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
