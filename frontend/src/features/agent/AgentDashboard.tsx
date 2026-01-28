import { useEffect, useState } from "react";
import { API_BASE } from "@/apiBase";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import CustomerDetails from "./CustomerDetails";

export default function AgentDashboard() {
  const [user, setUser] = useState<{ first_name?: string }>({});
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setUser(data))
      .catch(() => setUser({}));
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const [activePanel, setActivePanel] = useState<
    | "MY_CUSTOMERS"
    | "MY_VISITS"
    | "MY_FOLLOWUPS"
    | "MY_ATTENDANCE"
    | "TODAYS_SUMMARY"
    | null
  >(null);

  return (
    <AppShell sidebar={null} user={user} onLogout={logout}>
      <div className="flex justify-center items-center mb-8 border-b border-slate-100 pb-6">
        <a
          href="/agent/customers/resolve"
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-full shadow-md hover:shadow-indigo-200 transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
          </svg>
          <span>Customer Lookup</span>
        </a>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card accent="blue" className="cursor-pointer" onClick={() => setActivePanel("MY_CUSTOMERS") }>
          <CardHeader>
            <CardTitle>🏠 My Customers</CardTitle>
            <CardDescription>View and manage your customers</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="pink" className="cursor-pointer" onClick={() => setActivePanel("MY_VISITS") }>
          <CardHeader>
            <CardTitle>📍 My Visits</CardTitle>
            <CardDescription>Manage visit lifecycle</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="yellow" className="cursor-pointer" onClick={() => setActivePanel("MY_FOLLOWUPS") }>
          <CardHeader>
            <CardTitle>⏰ My Follow-ups</CardTitle>
            <CardDescription>Your scheduled follow-ups</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="green" className="cursor-pointer" onClick={() => setActivePanel("MY_ATTENDANCE") }>
          <CardHeader>
            <CardTitle>🕒 My Attendance</CardTitle>
            <CardDescription>Login / Logout for today</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="purple" className="cursor-pointer" onClick={() => setActivePanel("TODAYS_SUMMARY") }>
          <CardHeader>
            <CardTitle>📊 Today’s Summary</CardTitle>
            <CardDescription>Quick view of today’s activity</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Drawers for each action */}
      <Drawer open={activePanel === "MY_CUSTOMERS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>My Customers</DrawerTitle>
            <DrawerDescription>View and manage your customers</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-auto">
            <CustomerDetails />
          </div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "MY_VISITS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>My Visits</DrawerTitle>
            <DrawerDescription>Manage visit lifecycle</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Visit management content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "MY_FOLLOWUPS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>My Follow-ups</DrawerTitle>
            <DrawerDescription>Your scheduled follow-ups</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Follow-up content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "MY_ATTENDANCE"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>My Attendance</DrawerTitle>
            <DrawerDescription>Login / Logout for today</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Attendance content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "TODAYS_SUMMARY"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Today’s Summary</DrawerTitle>
            <DrawerDescription>Quick view of today’s activity</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Summary content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
