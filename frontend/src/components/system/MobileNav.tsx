// ============================================================================
// PHASE 2 — MobileNav
// ----------------------------------------------------------------------------
// A token-driven mobile navigation Drawer used by AppShell on sub-md viewports.
//
// Why a top-down drawer:
//   vaul's Drawer is gesture-friendly and animates from the bottom by default,
//   which is what real-world ops users expect on phones. We re-use the existing
//   <Drawer> primitive so nothing new is added to the bundle.
//
// API:
//   <MobileNav navItems={...} theme={...} role={...} user={...} onLogout={...} />
//   Items are the same role-aware nav arrays AppShell already builds — no
//   duplication of routes or naming.
//
// Behaviour:
//   - Tapping a nav item closes the drawer automatically (NavLink onClick).
//   - Logout button collapses to a destructive variant for muscle-memory clarity.
//   - Theme toggle slot duplicated so dark/light is reachable on mobile too.
//   - Does NOT render its own trigger — AppShell owns the placement; we expose
//     the Drawer root via a controlled open/onOpenChange pair.
// ============================================================================

import * as React from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/system/ThemeToggle";

export type MobileNavItem = {
  name: string;
  path: string;
  icon: LucideIcon;
};

export interface MobileNavTheme {
  initialBg: string;
  accentText: string;
  activeText: string;
  activeRing: string;
}

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: MobileNavItem[];
  theme: MobileNavTheme;
  user: { first_name: string; username: string; role?: string };
  onLogout: () => void;
}

export function MobileNav({
  open,
  onOpenChange,
  navItems,
  theme,
  user,
  onLogout,
}: MobileNavProps) {
  // Closing the drawer on nav-item click feels right on mobile — the user has
  // just intent-confirmed navigation.
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full max-w-full sm:w-[80vw] sm:max-w-[80vw]">
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-white shadow-elevation-1 ${theme.initialBg}`}
            >
              {user.first_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <DrawerTitle className="truncate">
                Hi, {user.first_name}
              </DrawerTitle>
              <DrawerDescription className="text-xs uppercase tracking-wider">
                <span className={theme.accentText}>{user.role}</span>
              </DrawerDescription>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </DrawerHeader>

        <nav className="px-4 pb-2 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={close}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  "transition-[background-color,color] duration-150 ease-ams-out",
                  isActive
                    ? `bg-accent ${theme.activeText} ring-1 ${theme.activeRing}`
                    : "text-foreground hover:bg-accent/60",
                ].join(" ")
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border mt-2">
          <Button
            variant="ghost"
            onClick={() => {
              close();
              onLogout();
            }}
            className="w-full justify-start text-muted-foreground hover:text-danger hover:bg-danger/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default MobileNav;
