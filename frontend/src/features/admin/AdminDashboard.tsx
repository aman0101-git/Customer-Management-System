import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
// ...removed PageContainer import...
import { AppShell } from "@/components/ui/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import CreateUserForm from "./CreateUserForm";

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<"CREATE_USER" | "SYSTEM_SETTINGS" | "AUDIT_LOGS" | null>(null);
  const { user, logout, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Session expired. Please log in again.</div>;
  return (
    <AppShell sidebar={null} user={user} onLogout={logout}>
      {/* Dashboard Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          accent="purple"
          className="cursor-pointer"
          onClick={() => setActivePanel("CREATE_USER")}
        >
          <CardHeader>
            <CardTitle>👤 Create User</CardTitle>
            <CardDescription>
              Create agents, supervisors, and admins
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>

        <Card accent="blue" className="cursor-pointer" onClick={() => setActivePanel("SYSTEM_SETTINGS") }>
          <CardHeader>
            <CardTitle>⚙️ System Settings</CardTitle>
            <CardDescription>
              Configure system rules and permissions
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>

        <Card accent="red" className="cursor-pointer" onClick={() => setActivePanel("AUDIT_LOGS") }>
          <CardHeader>
            <CardTitle>📊 Audit Logs</CardTitle>
            <CardDescription>
              Track admin actions and system events
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      {/* Drawers for each action */}
      <Drawer open={activePanel === "CREATE_USER"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create User</DrawerTitle>
            <DrawerDescription>Create agents, supervisors, and admins</DrawerDescription>
          </DrawerHeader>
          <CreateUserForm onSuccess={() => setActivePanel(null)} />
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "SYSTEM_SETTINGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>System Settings</DrawerTitle>
            <DrawerDescription>Configure system rules and permissions</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">System settings form goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      <Drawer open={activePanel === "AUDIT_LOGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Audit Logs</DrawerTitle>
            <DrawerDescription>Track admin actions and system events</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">Audit logs content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
      
    </AppShell>
  );
}
