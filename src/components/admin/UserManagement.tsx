import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, UserCheck, UserX, Mail, Shield, Eye, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  created_at: string;
  last_sign_in_at: string | null;
}

const roleColors = {
  admin: "destructive",
  manager: "default", 
  staff: "secondary",
  viewer: "outline"
} as const;

const roleIcons = {
  admin: Shield,
  manager: Users,
  staff: UserCheck,
  viewer: Eye
};

export function UserManagement() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'staff' | 'viewer'>('staff');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          user_roles!inner(role),
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map(profile => {
        const userRole = (profile.user_roles as any)?.[0]?.role || 'staff';
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: 'admin@example.com', // Will be replaced with actual email fetching
          role: userRole as 'admin' | 'manager' | 'staff' | 'viewer',
          created_at: profile.created_at,
          last_sign_in_at: null
        };
      }) as UserProfile[];
    }
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: { email, role }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User invitation sent successfully!");
      setInviteEmail("");
      setInviteRole('staff');
      setIsInviteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to invite user: ${error.message}`);
    }
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'manager' | 'staff' | 'viewer' }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User role updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update role: ${error.message}`);
    }
  });

  const handleInviteUser = () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    inviteUserMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleRoleChange = (userId: string, newRole: 'admin' | 'manager' | 'staff' | 'viewer') => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Invite new users and manage existing user roles</CardDescription>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to a new user. They will receive an email to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'admin' | 'manager' | 'staff' | 'viewer') => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                      <SelectItem value="manager">Manager - Business management</SelectItem>
                      <SelectItem value="staff">Staff - Daily operations</SelectItem>
                      <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleInviteUser} 
                  disabled={inviteUserMutation.isPending}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleColors[user.role]} className="flex items-center gap-1 w-fit">
                          <RoleIcon className="h-3 w-3" />
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : "Never"
                        }
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole: 'admin' | 'manager' | 'staff' | 'viewer') => handleRoleChange(user.id, newRole)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}