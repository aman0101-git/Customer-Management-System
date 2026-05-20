import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from "@/components/ui/drawer";
import { Loader2, Calendar, FileText, Layout, Activity, X, Briefcase } from "lucide-react";

// Phase 4 (May 2026):
//   - Migrated from a single useState form blob + manual handleChange to
//     react-hook-form + zod. Inputs are now uncontrolled — keystrokes don't
//     re-render the drawer body.
//   - Validations are minimal and match prior behavior: name + dates required.
//     One new UX guard: end_date >= start_date. Backend remains the
//     authoritative validator.
//   - The `submitting` prop from Phase 3 still drives button + drawer-close
//     behavior; the parent still owns the mutation.
//   - reset(initial-or-empty) runs on open/initial change so edit mode
//     repopulates correctly and create mode starts clean.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(100),
    description: z.string().max(500),
    start_date: z
      .string()
      .refine((s) => DATE_RE.test(s), "Start date is required"),
    end_date: z
      .string()
      .refine((s) => DATE_RE.test(s), "End date is required"),
    status: z.enum(["active", "paused", "done"], {
      message: "Status is required",
    }),
  })
  .refine((data) => data.end_date >= data.start_date, {
    path: ["end_date"],
    message: "End date must be on or after the start date",
  });

type ProjectFormValues = z.infer<typeof projectSchema>;

const EMPTY: ProjectFormValues = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  status: "active",
};

export default function ProjectFormDrawer({
  open,
  onClose,
  onSubmit,
  initial,
  submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initial?: any;
  submitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: EMPTY,
  });

  // Repopulate when drawer opens / initial changes. Matches prior timing.
  useEffect(() => {
    if (initial) {
      reset({
        name: initial.name ?? "",
        description: initial.description ?? "",
        start_date: initial.start_date ?? "",
        end_date: initial.end_date ?? "",
        status: (initial.status ?? "active") as ProjectFormValues["status"],
      });
    } else {
      reset(EMPTY);
    }
  }, [initial, open, reset]);

  const submit = (values: ProjectFormValues) => {
    if (submitting) return;
    onSubmit(values);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={open => {
        // Phase 3 invariant: don't allow closing the drawer mid-save.
        if (!open && submitting) return;
        if (!open) onClose();
      }}
    >
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
            <button
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-white">
          <form id="project-form" onSubmit={handleSubmit(submit)} className="space-y-8" noValidate>

            {/* Project Identity Section */}
            <div className="space-y-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4" /> Core Information
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="project-name" className="block text-sm font-semibold text-slate-700">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="project-name"
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-900 placeholder:text-slate-400 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-100"
                    placeholder="e.g. Ocean View Residency Phase 2"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "project-name-error" : undefined}
                    disabled={submitting}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p id="project-name-error" className="text-xs text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="project-description" className="block text-sm font-semibold text-slate-700">Description</label>
                  <div className="relative">
                    <FileText className="absolute top-3.5 left-3.5 w-5 h-5 text-slate-400" />
                    <textarea
                      id="project-description"
                      rows={3}
                      className="w-full py-3 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 resize-none aria-[invalid=true]:border-red-400"
                      placeholder="Briefly describe the project goals and scope..."
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? "project-description-error" : undefined}
                      disabled={submitting}
                      {...register("description")}
                    />
                  </div>
                  {errors.description && (
                    <p id="project-description-error" className="text-xs text-red-600">
                      {errors.description.message}
                    </p>
                  )}
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
                  <label htmlFor="project-start-date" className="block text-sm font-semibold text-slate-700">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input
                      id="project-start-date"
                      type="date"
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer font-medium text-slate-700 aria-[invalid=true]:border-red-400"
                      aria-invalid={!!errors.start_date}
                      aria-describedby={errors.start_date ? "project-start-date-error" : undefined}
                      disabled={submitting}
                      {...register("start_date")}
                    />
                  </div>
                  {errors.start_date && (
                    <p id="project-start-date-error" className="text-xs text-red-600">
                      {errors.start_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 group">
                  <label htmlFor="project-end-date" className="block text-sm font-semibold text-slate-700">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input
                      id="project-end-date"
                      type="date"
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer font-medium text-slate-700 aria-[invalid=true]:border-red-400"
                      aria-invalid={!!errors.end_date}
                      aria-describedby={errors.end_date ? "project-end-date-error" : undefined}
                      disabled={submitting}
                      {...register("end_date")}
                    />
                  </div>
                  {errors.end_date && (
                    <p id="project-end-date-error" className="text-xs text-red-600">
                      {errors.end_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="project-status" className="block text-sm font-semibold text-slate-700">Project Status</label>
                  <div className="relative">
                    <select
                      id="project-status"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all appearance-none font-medium text-slate-700 aria-[invalid=true]:border-red-400"
                      aria-invalid={!!errors.status}
                      aria-describedby={errors.status ? "project-status-error" : undefined}
                      disabled={submitting}
                      {...register("status")}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="done">Completed</option>
                    </select>
                    <div className="absolute right-4 top-4 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  {errors.status && (
                    <p id="project-status-error" className="text-xs text-red-600">
                      {errors.status.message}
                    </p>
                  )}
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
              className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="project-form"
              className="px-8 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? (initial ? "Saving..." : "Creating...")
                : (initial ? "Save Changes" : "Create Project")}
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
