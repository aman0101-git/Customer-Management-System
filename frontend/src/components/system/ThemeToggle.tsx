// ============================================================================
// frontend/src/components/system/ThemeToggle.tsx
// ----------------------------------------------------------------------------
// Phase 1 (May 2026):
//   Accessible sun/moon toggle. Re-uses the existing shadcn Button (ghost +
//   icon size) so it visually matches the rest of the AppShell header.
//
//   - Renders nothing until mounted (avoids a one-frame hydration flash where
//     the icon flips after first paint).
//   - aria-label is dynamic so screen readers announce the target action.
// ============================================================================

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Reserve space so the header layout does not shift after mount.
    return <span className="inline-block h-9 w-9" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}
