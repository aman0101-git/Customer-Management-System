import { useEffect, useState } from "react";
import { API_BASE } from "@/apiBase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
// ...removed PageContainer import...
import { AppShell } from "@/components/ui/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import CreateUserForm from "../admin/CreateUserForm";

export default function SupervisorDashboard() {
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
    | "AGENTS_OVERVIEW"
    | "VISITS_MONITORING"
    | "FOLLOWUP_DISCIPLINE"
    | "ATTENDANCE_MONITORING"
    | "CREATE_USER"
    | null
  >(null);

  return (
    <AppShell sidebar={null} user={user} onLogout={logout}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          accent="purple"
          className="cursor-pointer"
          onClick={() => setActivePanel("CREATE_USER")}
        >
          <CardHeader>
            <CardTitle>👤 Create Agent</CardTitle>
            <CardDescription>
              Create Agents
            </CardDescription>
          </CardHeader>
          {/* No CardContent needed for action card */}
        </Card>
              {/* Drawer for Create User */}
              <Drawer open={activePanel === "CREATE_USER"} onOpenChange={open => !open && setActivePanel(null)}>
                <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
                  <DrawerHeader>
                    <DrawerTitle>Create Agent</DrawerTitle>
                    <DrawerDescription>Create Agents</DrawerDescription>
                  </DrawerHeader>
                  <CreateUserForm allowedRoles={['AGENT']} onSuccess={() => setActivePanel(null)} />
                  <DrawerClose asChild>
                    <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
                  </DrawerClose>
                </DrawerContent>
              </Drawer>
        <Card accent="blue" className="cursor-pointer" onClick={() => setActivePanel("AGENTS_OVERVIEW") }>
          <CardHeader>
            <CardTitle>👥 Agents Overview</CardTitle>
            <CardDescription>View agents and activity</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="pink" className="cursor-pointer" onClick={() => setActivePanel("VISITS_MONITORING") }>
          <CardHeader>
            <CardTitle>📍 Visits Monitoring</CardTitle>
            <CardDescription>Track visits across agents</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="yellow" className="cursor-pointer" onClick={() => setActivePanel("FOLLOWUP_DISCIPLINE") }>
          <CardHeader>
            <CardTitle>⏰ Follow-up Discipline</CardTitle>
            <CardDescription>Overdue and upcoming follow-ups</CardDescription>
          </CardHeader>
        </Card>

        <Card accent="green" className="cursor-pointer" onClick={() => setActivePanel("ATTENDANCE_MONITORING") }>
          <CardHeader>
            <CardTitle>🕒 Attendance Monitoring</CardTitle>
            <CardDescription>Login / logout and work hours</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Drawers for each action */}
      <Drawer open={activePanel === "AGENTS_OVERVIEW"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Agents Overview</DrawerTitle>
            <DrawerDescription>View agents and activity</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Agents overview content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "VISITS_MONITORING"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Visits Monitoring</DrawerTitle>
            <DrawerDescription>Track visits across agents</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Visits monitoring content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "FOLLOWUP_DISCIPLINE"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Follow-up Discipline</DrawerTitle>
            <DrawerDescription>Overdue and upcoming follow-ups</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Follow-up discipline content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "ATTENDANCE_MONITORING"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Attendance Monitoring</DrawerTitle>
            <DrawerDescription>Login / logout and work hours</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Attendance monitoring content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
    </AppShell>
  );
}
