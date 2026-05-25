// ============================================================================
// PHASE 3 — ProjectFormDrawer
// ----------------------------------------------------------------------------
// Phase 4 form behaviour (react-hook-form + zod) preserved byte-equivalent.
// Visual layer tokenized — drawer header/footer, all inputs, action buttons.
// ============================================================================

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Loader2, Calendar, FileText, Layout, Activity, X, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import NativeSelect from "@/components/system/NativeSelect";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(100),
    description: z.string().max(500),
    start_date: z.string().refine((s) => DATE_RE.test(s), "Start date is required"),
    end_date:   z.string().refine((s) => DATE_RE.test(s), "End date is required"),
    status: z.enum(["active", "paused", "done"], { message: "Status is required" }),
  })
  .refine((data) => data.end_date >= data.start_date, {
    path: ["end_date"],
    message: "End date must be on or after the start date",
  });

type ProjectFormValues = z.infer<typeof projectSchema>;

const EMPTY: ProjectFormValues = {
  name: "", description: "", start_date: "", end_date: "", status: "active",
};

export default function ProjectFormDrawer({
  open, onClose, onSubmit, initial, submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initial?: any;
  submitting?: boolean;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: EMPTY,
  });

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
        if (!open && submitting) return;
        if (!open) onClose();
      }}
    >
      <DrawerContent className="max-w-2xl ml-auto h-full rounded-l-2xl border-l border-border shadow-elevation-4 bg-popover text-popover-foreground flex flex-col focus:outline-none">

        <DrawerHeader className="flex items-center justify-between border-b border-border px-8 py-6 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand/15 text-brand rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <DrawerTitle className="text-xl font-bold text-foreground">
                {initial ? "Edit Project Details" : "Create New Project"}
              </DrawerTitle>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                {initial ? "Update project information and timeline." : "Define the scope and schedule for a new initiative."}
              </p>
            </div>
          </div>
          <DrawerClose asChild>
            <button
              className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <form id="project-form" onSubmit={handleSubmit(submit)} className="space-y-8" noValidate>

            <div className="space-y-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-4 h-4" /> Core Information
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name" className="text-foreground">
                    Project Name <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="project-name"
                    placeholder="e.g. Ocean View Residency Phase 2"
                    className="h-11"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "project-name-error" : undefined}
                    disabled={submitting}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p id="project-name-error" className="text-xs text-danger">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="project-description" className="text-foreground">Description</Label>
                  <div className="relative">
                    <FileText className="absolute top-3.5 left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Textarea
                      id="project-description"
                      rows={3}
                      className="pl-10 resize-none"
                      placeholder="Briefly describe the project goals and scope..."
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? "project-description-error" : undefined}
                      disabled={submitting}
                      {...register("description")}
                    />
                  </div>
                  {errors.description && (
                    <p id="project-description-error" className="text-xs text-danger">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="hairline" />

            <div className="space-y-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4" /> Timeline & Status
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 group">
                  <Label htmlFor="project-start-date" className="text-foreground">
                    Start Date <span className="text-danger">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="project-start-date"
                      type="date"
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                      className="h-11 pl-10 cursor-pointer"
                      aria-invalid={!!errors.start_date}
                      aria-describedby={errors.start_date ? "project-start-date-error" : undefined}
                      disabled={submitting}
                      {...register("start_date")}
                    />
                  </div>
                  {errors.start_date && (
                    <p id="project-start-date-error" className="text-xs text-danger">
                      {errors.start_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 group">
                  <Label htmlFor="project-end-date" className="text-foreground">
                    End Date <span className="text-danger">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="project-end-date"
                      type="date"
                      onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
                      className="h-11 pl-10 cursor-pointer"
                      aria-invalid={!!errors.end_date}
                      aria-describedby={errors.end_date ? "project-end-date-error" : undefined}
                      disabled={submitting}
                      {...register("end_date")}
                    />
                  </div>
                  {errors.end_date && (
                    <p id="project-end-date-error" className="text-xs text-danger">
                      {errors.end_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="project-status" className="text-foreground">Project Status</Label>
                  <NativeSelect
                    id="project-status"
                    aria-invalid={!!errors.status}
                    aria-describedby={errors.status ? "project-status-error" : undefined}
                    disabled={submitting}
                    wrapperClassName="w-full"
                    className="h-11 aria-[invalid=true]:border-danger"
                    {...register("status")}
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="done">Completed</option>
                  </NativeSelect>
                  {errors.status && (
                    <p id="project-status-error" className="text-xs text-danger">
                      {errors.status.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <DrawerFooter className="border-t border-border bg-muted/30 px-8 py-6">
          <div className="flex items-center justify-end gap-3 w-full">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="project-form" disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? (initial ? "Saving..." : "Creating...")
                : (initial ? "Save Changes" : "Create Project")}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
