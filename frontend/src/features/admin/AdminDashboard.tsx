import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";
import RouteFallback from "@/components/system/RouteFallback";
import { UserPlus, Settings, ClipboardList } from "lucide-react";
import CreateUserForm from "./CreateUserForm";

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<"CREATE_USER" | "SYSTEM_SETTINGS" | "AUDIT_LOGS" | null>(null);
  const { user, loading } = useAuth();
  if (loading || !user) return <RouteFallback />;
  return (
    <AppShell sidebar={null}>
      {/* Dashboard Actions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card
          accent="purple"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => setActivePanel("CREATE_USER")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Create User
            </CardTitle>
            <CardDescription>Create agents, supervisors, and admins</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="blue"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => setActivePanel("SYSTEM_SETTINGS")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" /> System Settings
            </CardTitle>
            <CardDescription>Configure system rules and permissions</CardDescription>
          </CardHeader>
        </Card>

        <Card
          accent="red"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => setActivePanel("AUDIT_LOGS")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> Audit Logs
            </CardTitle>
            <CardDescription>Track admin actions and system events</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Create User Drawer */}
      <Drawer open={activePanel === "CREATE_USER"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create User</DrawerTitle>
            <DrawerDescription>Create agents, supervisors, and admins</DrawerDescription>
          </DrawerHeader>
          <CreateUserForm onSuccess={() => setActivePanel(null)} />
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {/* System Settings Drawer (stub — no backend endpoint yet) */}
      <Drawer open={activePanel === "SYSTEM_SETTINGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>System Settings</DrawerTitle>
            <DrawerDescription>Configure system rules and permissions</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 text-slate-500">System settings form goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

      {/* Audit Logs Drawer (stub — no backend endpoint yet) */}
      <Drawer open={activePanel === "AUDIT_LOGS"} onOpenChange={open => !open && setActivePanel(null)}>
        <DrawerContent className="max-w-7xl w-full mx-auto h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Audit Logs</DrawerTitle>
            <DrawerDescription>Track admin actions and system events</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 text-slate-500">Audit logs content goes here.</div>
          <DrawerClose asChild>
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>

    </AppShell>
  );
}
