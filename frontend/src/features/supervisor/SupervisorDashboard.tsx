import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AppShell } from "@/components/ui/app-shell";
import { useNavigate } from "react-router-dom";
import { 
  FileSpreadsheet, 
  Users, 
  FolderKanban, 
  CalendarClock, 
  BarChart3, 
  Search 
} from "lucide-react";

export default function SupervisorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Session expired. Please log in again.</div>;

  return (
    <AppShell sidebar={null}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 w-full px-6">
        
        <Card
          accent="purple"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md"
          onClick={() => navigate("/supervisor/create-user")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> 
              Agent Management
            </CardTitle>
            <CardDescription>
              Create and manage agents
            </CardDescription>
          </CardHeader>
        </Card>

        <Card 
          accent="pink" 
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" 
          onClick={() => navigate("/supervisor/project-allocation")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5" /> 
              Project Allocation
            </CardTitle>
            <CardDescription>Create projects and allocate to agents</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          accent="yellow" 
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" 
          onClick={() => navigate("/supervisor/follow-ups")} 
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" /> 
              Follow-up Discipline
            </CardTitle>
            <CardDescription>Overdue and upcoming follow-ups</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          accent="blue" 
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" 
          onClick={() => navigate("/supervisor/summarydashboard")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> 
              Summary Dashboards
            </CardTitle>
            <CardDescription>Quick view of Agents’ activity</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          accent="green"
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" 
          onClick={() => navigate("/supervisor/export-data")} 
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" /> 
              Export Data
            </CardTitle>
            <CardDescription>Download CSV/Excel reports</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          accent="red" 
          className="cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-md" 
          onClick={() => navigate("/supervisor/customer-search")} 
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" /> 
              Global Lead Search
            </CardTitle>
            <CardDescription>Search any customer and view assignment details</CardDescription>
          </CardHeader>
        </Card>
  
        {/* <Card accent="green" className="cursor-pointer" onClick={() => {}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Attendance Monitoring
            </CardTitle>
            <CardDescription>Login / logout and work hours</CardDescription>
          </CardHeader>
        </Card> */}
        
      </div>
    </AppShell>
  );
}