import * as React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react"; // Added for a more premium feel

export interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  onLogout?: () => void;
  user?: { first_name?: string };
}

export function AppShell({ sidebar, children, onLogout, user }: AppShellProps) {
  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Sidebar - Darker Slate for High Contrast */}
      {sidebar && (
        <aside className="w-72 hidden md:flex flex-col bg-slate-950 text-slate-200 border-r border-slate-800 shadow-2xl">
          <div className="p-6 border-b border-slate-800/50">
             {/* Placeholder for Logo Area */}
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">A</div>
                <span className="text-xl font-bold tracking-tight text-white">AMS <span className="text-blue-500 text-sm font-normal">PRO</span></span>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
            {sidebar}
          </div>
        </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col">
        {/* Header - Glassmorphism effect */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between bg-slate-200 backdrop-blur-md border-b border-slate-200 px-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-[2px] bg-blue-600 rounded-full hidden md:block"></div>
            <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 leading-none">Dashboard</span>
                <div className="text-lg font-bold text-slate-900 leading-tight">
                    Welcome, <span className="text-blue-600">{user?.first_name ?? "System"}</span>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {onLogout && (
              <Button 
                variant="ghost" 
                onClick={onLogout}
                className="bg-red-600 text-white hover:bg-red-700 hover:text-white-800 transition-all duration-200 flex items-center gap-2 group px-4 py-2 rounded-lg"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform text-white" />
                <span className="font-semibold">Logout</span>
              </Button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}