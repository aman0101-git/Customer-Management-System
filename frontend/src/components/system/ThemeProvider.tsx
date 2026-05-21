// ============================================================================
// frontend/src/components/system/ThemeProvider.tsx
// ----------------------------------------------------------------------------
// Phase 1 (May 2026):
//   Thin wrapper around next-themes' ThemeProvider that locks in our defaults.
//
//   - attribute="class"          -> swaps the `dark` class on <html>, matching
//                                   the existing Tailwind config (darkMode:["class"]).
//   - defaultTheme="light"       -> per Phase 1 spec, light is default. We do
//                                   NOT enable system preference at boot to
//                                   avoid surprising 50+ live agents on first
//                                   load. Users opt in via the toggle.
//   - enableSystem={false}       -> matches above.
//   - disableTransitionOnChange  -> prevents CSS transitions from running
//                                   mid-swap, eliminating layout flicker.
//   - storageKey="ams-theme"     -> namespaced so we don't collide with other
//                                   apps' next-themes installs on the same host.
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
