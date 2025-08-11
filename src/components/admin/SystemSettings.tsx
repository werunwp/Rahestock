import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Database, Users, FileText, Settings, AlertCircle } from "lucide-react";

export function SystemSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Information
          </CardTitle>
          <CardDescription>Current system status and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Authentication</p>
                  <p className="text-xs text-muted-foreground">Supabase Auth</p>
                </div>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">PostgreSQL</p>
                </div>
              </div>
              <Badge variant="default">Connected</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">User Signup</p>
                  <p className="text-xs text-muted-foreground">Admin controlled</p>
                </div>
              </div>
              <Badge variant="secondary">Disabled</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Data Backup</p>
                  <p className="text-xs text-muted-foreground">Export/Import</p>
                </div>
              </div>
              <Badge variant="default">Available</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Security Notes
          </CardTitle>
          <CardDescription>Important security considerations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <p className="text-sm font-medium">Public Signup Disabled</p>
            <p className="text-xs text-muted-foreground mt-1">
              Only administrators can invite new users to maintain security and control access.
            </p>
          </div>
          
          <div className="p-3 rounded-lg border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
            <p className="text-sm font-medium">Role-Based Access Control</p>
            <p className="text-xs text-muted-foreground mt-1">
              Users are assigned specific roles (Admin, Manager, Staff, Viewer) with appropriate permissions.
            </p>
          </div>
          
          <div className="p-3 rounded-lg border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950">
            <p className="text-sm font-medium">Row Level Security</p>
            <p className="text-xs text-muted-foreground mt-1">
              Database policies ensure users can only access data they're authorized to view.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}