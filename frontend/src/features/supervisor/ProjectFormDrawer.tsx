import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from "@/components/ui/drawer";
import { Calendar, FileText, Layout, Activity, X, Briefcase } from "lucide-react";

export default function ProjectFormDrawer({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initial?: any;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active"
  });

  // Update form state when initial data changes (for Edit mode)
  useEffect(() => {
    if (initial) {
      setForm(initial);
    } else {
      setForm({ name: "", description: "", start_date: "", end_date: "", status: "active" });
    }
  }, [initial, open]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Drawer open={open} onOpenChange={open => { if (!open) onClose(); }}>
      {/* 1. Expanded Drawer Size: Changed max-w-md to max-w-2xl */}
      <DrawerContent className="max-w-2xl ml-auto h-full rounded-l-2xl border-l border-slate-200 shadow-2xl bg-white flex flex-col focus:outline-none">
        
        {/* Header */}
        <DrawerHeader className="flex items-center justify-between border-b border-slate-100 px-8 py-6 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold text-slate-900">
                {initial ? "Edit Project Details" : "Create New Project"}
              </DrawerTitle>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {initial ? "Update project information and timeline." : "Define the scope and schedule for a new initiative."}
              </p>
            </div>
          </div>
          <DrawerClose asChild>
            <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-white">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Project Identity Section */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4" /> Core Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Project Name <span className="text-rose-500">*</span></label>
                  <input 
                    name="name" 
                    value={form.name} 
                    onChange={handleChange} 
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="e.g. Ocean View Residency Phase 2" 
                    required 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Description</label>
                  <div className="relative">
                    <FileText className="absolute top-3.5 left-3.5 w-5 h-5 text-slate-400" />
                    <textarea 
                      name="description" 
                      value={form.description} 
                      onChange={handleChange} 
                      rows={3}
                      className="w-full py-3 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 resize-none"
                      placeholder="Briefly describe the project goals and scope..." 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Timeline & Status Section */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" /> Timeline & Status
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 group">
                  <label className="block text-sm font-semibold text-slate-700">Start Date <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input 
                      name="start_date" 
                      type="date" 
                      value={form.start_date} 
                      onChange={handleChange} 
                      // 3. Fix: onClick opens the picker immediately
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer font-medium text-slate-700"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 group">
                  <label className="block text-sm font-semibold text-slate-700">End Date <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input 
                      name="end_date" 
                      type="date" 
                      value={form.end_date} 
                      onChange={handleChange} 
                      // 3. Fix: onClick opens the picker immediately
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer font-medium text-slate-700"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">Project Status</label>
                  <div className="relative">
                    <select 
                      name="status" 
                      value={form.status} 
                      onChange={handleChange} 
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all appearance-none font-medium text-slate-700"
                    >
                      <option value="active">🟢 Active</option>
                      <option value="paused">🟠 Paused</option>
                      <option value="done">🔵 Completed</option>
                    </select>
                    <div className="absolute right-4 top-4 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <DrawerFooter className="border-t border-slate-100 bg-slate-50/50 px-8 py-6">
          <div className="flex items-center justify-end gap-3 w-full">
            <button 
              type="button" 
              className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="project-form" // Link button to form
              className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95"
            >
              {initial ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}