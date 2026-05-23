// ============================================================================
// frontend/src/components/system/ThemeProvider.tsx
// ----------------------------------------------------------------------------
// Phase 1: thin wrapper around next-themes that locks in our defaults.
//   - attribute="class"          → toggles `dark` class on <html>.
//   - defaultTheme="light"       → light by default (does not flip dark
//                                  for live agents who haven't opted in).
//   - enableSystem={false}       → do not auto-follow OS preference at boot.
//   - disableTransitionOnChange  → prevent CSS transitions from firing
//                                  mid-swap (no theme-flicker).
//   - storageKey="ams-theme"     → namespaced persistence key.
//
// Phase 4 — default-theme decision:
//   The dark-mode token system is verified production-ready end-to-end and
//   every Phase 1-3 surface renders correctly in both themes. We are
//   INTENTIONALLY keeping `defaultTheme="light"` for Phase 4 because:
//
//     1. Per-user theme choices are persisted via storageKey="ams-theme",
//        so any user who already toggled to dark keeps dark on next visit.
//     2. The Phase 4 brief explicitly states the default flip should be a
//        deliberate product decision, not a styling experiment.
//     3. A future flip is a one-line change here. Recommended sequence
//        when ready: (a) stakeholder comms, (b) optional opt-in banner
//        pointing at the toggle, (c) flip default to "dark",
//        (d) consider `enableSystem={true}` once dark usage normalizes.
// ============================================================================

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="ams-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
