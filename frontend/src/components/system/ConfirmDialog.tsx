// ============================================================================
// frontend/src/components/system/ConfirmDialog.tsx
// ----------------------------------------------------------------------------
// Phase 3 (May 2026):
//   Small accessible confirmation dialog built on the existing shadcn Dialog
//   primitive. Replaces window.confirm() for destructive actions like
//   "Deactivate user" or "Deactivate project".
//
//   - Controlled component (parent owns `open`).
//   - `tone` chooses red vs. default styling of the confirm button.
//   - `pending` reflects the in-flight mutation: while true, both buttons are
//     disabled and the confirm button shows a spinner so users can't fire the
//     mutation twice or cancel mid-write.
//   - No global state, no new abstraction layer. Just an instance of the
//     existing Dialog primitive with a sensible default shape.
// ============================================================================

import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "destructive";
  pending?: boolean;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block closing while a mutation is in flight — destructive actions
        // must complete or fail before the dialog can be dismissed.
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
