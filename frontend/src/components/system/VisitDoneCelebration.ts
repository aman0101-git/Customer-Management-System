// ============================================================================
// CLOSEOUT — Visit Done celebration
// ----------------------------------------------------------------------------
// Lightweight, professional success acknowledgement fired when an agent saves
// a customer with status `visit-done` or `booking-done`.
//
// Implementation choices (per the brief):
//   - Built on the existing sonner toast pipeline — NO new notification
//     framework, NO new dependencies.
//   - Custom JSX content so the toast reads as an achievement, not a generic
//     status update. Uses token-driven success styling + a single check icon.
//   - Non-blocking: toast appears top-right, doesn't steal focus.
//   - Short duration (3.5s) — long enough to feel like a real moment, short
//     enough to never interfere with the next click.
//   - Restrained: one celebratory line + one supporting subline. No
//     confetti, no oversized icons, no childishness.
//   - Honours prefers-reduced-motion via the global rule in index.css —
//     the `animate-rise-in` keyframe collapses to 0ms.
//
// Caller contract:
//   import { celebrateVisitDone } from "@/components/system/VisitDoneCelebration";
//   celebrateVisitDone("visit-done", customer.name);  // or "booking-done"
//
// Returns nothing; throws nothing; safe to call regardless of any other
// toast state. If the status isn't a celebration-eligible code it no-ops.
// ============================================================================

import { toast } from "sonner";
import { createElement } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

const CELEBRATION_CODES = new Set(["visit-done", "booking-done"]);

const COPY: Record<string, { headline: string; sub: string }> = {
  "visit-done": {
    headline: "Visit completed",
    sub: "Logged on the customer timeline.",
  },
  "booking-done": {
    headline: "Booking confirmed",
    sub: "Milestone added to the customer record.",
  },
};

/**
 * Fire the celebration toast. No-op if `statusCode` is not a celebration code.
 */
export function celebrateVisitDone(statusCode: string, customerName?: string) {
  const code = (statusCode || "").toLowerCase();
  if (!CELEBRATION_CODES.has(code)) return;

  const { headline, sub } = COPY[code];

  toast.custom(
    () =>
      createElement(
        "div",
        {
          className:
            "flex items-start gap-3 rounded-xl border border-success/30 " +
            "bg-card text-card-foreground shadow-elevation-3 " +
            "p-4 min-w-[20rem] max-w-sm animate-rise-in",
          role: "status",
          "aria-live": "polite",
        },
        // Token-driven success badge with the check icon and a quiet sparkle.
        createElement(
          "div",
          {
            className:
              "relative inline-flex h-10 w-10 shrink-0 items-center justify-center " +
              "rounded-full bg-success/15 text-success",
          },
          createElement(CheckCircle2, { className: "w-5 h-5", "aria-hidden": true }),
          createElement(Sparkles, {
            className: "absolute -top-1 -right-1 w-3 h-3 text-success/70",
            "aria-hidden": true,
          })
        ),
        createElement(
          "div",
          { className: "min-w-0 flex-1" },
          createElement(
            "div",
            { className: "text-sm font-semibold text-foreground" },
            headline
          ),
          createElement(
            "div",
            { className: "text-xs text-muted-foreground mt-0.5 truncate" },
            customerName ? `${customerName} — ${sub}` : sub
          )
        )
      ),
    { duration: 3500 }
  );
}

export default celebrateVisitDone;
