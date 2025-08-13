import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "@/components/admin/UserManagement";
import { BusinessAnalytics } from "@/components/admin/BusinessAnalytics";
import { SystemSettings } from "@/components/admin/SystemSettings";
import { Users, BarChart3, Settings, Shield } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  // Prefetch users data when component mounts for instant loading
  useEffect(() => {
    if (user && isAdmin && !authLoading && !roleLoading) {
      queryClient.prefetchQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
          const { data, error } = await supabase.functions.invoke('admin-list-users');
          
          if (error) {
            throw new Error(error.message || 'Failed to fetch users');
          }
          
          if (!data?.success) {
            throw new Error(data?.error || 'Failed to fetch users');
          }
          
          return data.users;
        },
        staleTime: 30000,
        gcTime: 300000
      });
    }
  }, [user, isAdmin, authLoading, roleLoading, queryClient]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Business Administration</h1>
            <p className="text-muted-foreground">Manage users, monitor business performance, and configure system settings</p>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <BusinessAnalytics />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}