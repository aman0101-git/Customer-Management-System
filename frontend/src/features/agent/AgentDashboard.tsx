import { useEffect, useState } from "react";
import { API_BASE } from "@/apiBase";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// ...removed PageContainer import...
import { AppShell } from "@/components/ui/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";

export default function AgentDashboard() {
  const [user, setUser] = useState<{ first_name?: string }>({});
  useEffect(() => {
    const token = localStorage.getItem("ams_token");
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUser(data));
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
      <div className="flex justify-start items-center mb-6">
        <a
          href="/agent/customers/resolve"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition"
        >
          Create / Search Customer
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
          <div className="p-4">Customer management content goes here.</div>
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
