import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  LayoutDashboard, 
  Search, 
  Users, 
  Clock, 
  PieChart, 
  Menu, 
  UserPlus, 
  Briefcase, 
  Settings, 
  ShieldAlert 
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";

export interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const { user, logout, loading } = useAuth();

  // ----------------------------------------------------------------------
  // 1. Define Navigation Configurations
  // ----------------------------------------------------------------------

  const agentNav = [
    { name: "Dashboard", path: "/agent/dashboard", icon: LayoutDashboard },
    { name: "Lookup", path: "/agent/customers/resolve", icon: Search },
    { name: "Customers", path: "/agent/customers", icon: Users },
    { name: "Follow-ups", path: "/agent/followups", icon: Clock },
    { name: "Summary", path: "/agent/summary", icon: PieChart },
  ];

  // Matches routes in SupervisorDashboard
  const supervisorNav = [
    { name: "Dashboard", path: "/supervisor/dashboard", icon: LayoutDashboard }, // Added a home link
    { name: "Agents", path: "/supervisor/create-user", icon: UserPlus },
    { name: "Projects", path: "/supervisor/project-allocation", icon: Briefcase },
    { name: "Follow ups", path: "/supervisor/follow-ups", icon: Clock },
    { name: "Summary", path: "/supervisor/summarydashboard", icon: PieChart },
    
  ];

  // Matches concepts in AdminDashboard (assuming you will create routes for these later, 
  // or you can just keep 'Dashboard' if it's a single-page view)
  const adminNav = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", path: "/admin/users", icon: Users },         // Placeholder for future route
    { name: "Settings", path: "/admin/settings", icon: Settings }, // Placeholder for future route
    { name: "Audit", path: "/admin/audit", icon: ShieldAlert },    // Placeholder for future route
  ];

  if (loading || !user) return null;

  // ----------------------------------------------------------------------
  // 2. Determine Role & Theme
  // ----------------------------------------------------------------------
  
  let navItems = agentNav;
  let homeLink = "/agent/dashboard";
  let themeColor = "text-blue-600";
  let bgTheme = "bg-blue-600";
  let ringTheme = "ring-blue-200";
  let activeText = "text-blue-700";

  // Normalize role string (case-insensitive check is safer)
  const role = user.role?.toLowerCase() || "agent";

  if (role === "supervisor") {
    navItems = supervisorNav;
    homeLink = "/supervisor/dashboard";
    themeColor = "text-purple-600";
    bgTheme = "bg-purple-600";
    ringTheme = "ring-purple-200";
    activeText = "text-purple-700";
  } else if (role === "admin") {
    navItems = adminNav;
    homeLink = "/admin/dashboard";
    themeColor = "text-red-600";
    bgTheme = "bg-red-600";
    ringTheme = "ring-red-200";
    activeText = "text-red-700";
  }

  // ----------------------------------------------------------------------
  // 3. Render
  // ----------------------------------------------------------------------

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Sidebar (Optional) */}
      {sidebar && (
        <aside className="w-72 hidden md:flex flex-col bg-slate-950 text-slate-200 border-r border-slate-800 shadow-2xl">
          <div className="p-6 border-b border-slate-800/50">
             <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white ${bgTheme}`}>
                {user.first_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xl font-bold tracking-tight text-white">AMS <span className={`text-sm font-normal ${themeColor}`}>PRO</span></span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-4">{sidebar}</div>
        </aside>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col">
        
        {/* Header */}
        <header className="sticky top-0 z-20 h-16 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 lg:px-10 shadow-sm">
          
          {/* LEFT: Branding & Welcome */}
          <div className="flex items-center w-[250px]">
             {!sidebar && (
                <Link to={homeLink} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm ${bgTheme}`}>
                      {user.first_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-800 text-lg hidden sm:block tracking-tight">
                      Welcome, <span className={themeColor}>{user.first_name}</span>
                    </span>
                </Link>
             )}
          </div>

          {/* CENTER: Dynamic Navigation */}
          <nav className="hidden md:flex items-center justify-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/60">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? `bg-white ${activeText} shadow-sm ring-1 ${ringTheme}`
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* RIGHT: User Profile & Actions */}
          <div className="flex items-center justify-end gap-4 w-[250px]">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-none">{user.username}</p>
              <p className={`text-[10px] uppercase tracking-wider mt-1 font-bold ${themeColor}`}>
                {user.role}
              </p>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

            <Button
              variant="ghost"
              onClick={logout}
              size="sm"
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only sm:inline-block">Logout</span>
            </Button>
            
            <Button variant="ghost" size="icon" className="md:hidden text-slate-600">
              <Menu className="w-5 h-5" />
            </Button>
          </div>

        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;