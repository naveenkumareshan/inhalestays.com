
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import { FileText, Users, LayoutDashboard, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardStatistics } from "@/components/admin/DashboardStatistics";
import { UserSessionsManagement } from "@/components/admin/UserSessionsManagement";
import { useSearchParams } from 'react-router-dom';
import { useVendorEmployeePermissions } from "@/hooks/useVendorEmployeePermissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'dashboard' | 'sessions' | null;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions'>(
    tabFromUrl || 'dashboard'
  );
  const { hasPermission } = useVendorEmployeePermissions();
  
  const { user } = useAuth();

  const handleTabChange = (value: string) => {
    const newTab = value as 'dashboard' | 'sessions';
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'admin': return 'Admin';
      case 'vendor': return 'Host';
      case 'vendor_employee': return 'Employee';
      default: return 'User';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-primary via-primary/90 to-accent/80 rounded-lg p-4 text-primary-foreground">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70 mb-1">
            <span>{getRoleLabel()} Panel</span>
            <span>/</span>
            <span className="text-primary-foreground font-medium">Dashboard</span>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-primary-foreground/80 text-xs mt-0.5">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'} — here's your operational overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <a href="/partner/login" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                <ExternalLink className="h-4 w-4" />
                Partner Portal
              </Button>
            </a>
          )}
          <Link to="/admin/reports">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
              <FileText className="h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'vendor' || hasPermission('view_dashboard')) && (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="flex items-center justify-between border-b px-6 pt-4 pb-0">
                <TabsList className="h-9">
                  <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-sm">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Overview
                  </TabsTrigger>
                  {user?.role === 'admin' && (
                    <TabsTrigger value="sessions" className="flex items-center gap-1.5 text-sm">
                      <Users className="h-3.5 w-3.5" />
                      User Sessions
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              <div className="p-4">
                <TabsContent value="dashboard" className="mt-0">
                  <DashboardStatistics />
                </TabsContent>
                <TabsContent value="sessions" className="mt-0">
                  <UserSessionsManagement />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
