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
import { Plus, UserCheck, UserX, Shield, Eye, Users, Edit, Trash2, User } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserFormData {
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  password: string;
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

const initialFormData: UserFormData = {
  full_name: '',
  email: '',
  phone: '',
  role: 'staff',
  password: ''
};

export function UserManagement() {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all users with their roles and auth data
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Get users from auth service (admin access required)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Get profiles and roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          user_id,
          full_name,
          phone,
          user_roles!inner(role)
        `);

      if (profilesError) throw profilesError;

      // Combine auth data with profile data
      const combinedUsers = authUsers.users.map(authUser => {
        const profile = profiles.find(p => p.user_id === authUser.id);
        const userRole = (profile?.user_roles as any)?.[0]?.role || 'staff';
        
        return {
          id: authUser.id,
          full_name: profile?.full_name || 'Unknown',
          email: authUser.email || '',
          phone: profile?.phone || null,
          role: userRole as 'admin' | 'manager' | 'staff' | 'viewer',
          created_at: authUser.created_at,
          last_sign_in_at: authUser.last_sign_in_at
        };
      });

      return combinedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as UserProfile[];
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const { data, error } = await supabase.functions.invoke('admin-invite-user', {
        body: userData
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User created successfully!");
      setFormData(initialFormData);
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, ...userData }: { userId: string } & Partial<UserFormData>) => {
      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: { userId, ...userData }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User updated successfully!");
      setEditingUser(null);
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update user: ${error.message}`);
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to delete user: ${error.message}`);
    }
  });

  const handleCreateUser = () => {
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error("Please fill in required fields (name and email)");
      return;
    }
    
    createUserMutation.mutate(formData);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '' // Don't prefill password
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser || !formData.full_name.trim() || !formData.email.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    
    updateUserMutation.mutate({ 
      userId: editingUser.id, 
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone || null,
      role: formData.role
    });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create and manage user accounts</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user account. The account will be activated immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave empty for default password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value: 'admin' | 'manager' | 'staff' | 'viewer') => setFormData(prev => ({ ...prev, role: value }))}>
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
                  onClick={handleCreateUser} 
                  disabled={createUserMutation.isPending}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
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
                  <TableHead>Phone</TableHead>
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
                      <TableCell>{user.phone || '-'}</TableCell>
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.full_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name *</Label>
              <Input
                id="edit_full_name"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Email Address *</Label>
              <Input
                id="edit_email"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input
                id="edit_phone"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_role">Role</Label>
              <Select value={formData.role} onValueChange={(value: 'admin' | 'manager' | 'staff' | 'viewer') => setFormData(prev => ({ ...prev, role: value }))}>
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
              onClick={handleUpdateUser} 
              disabled={updateUserMutation.isPending}
              className="w-full"
            >
              <Edit className="h-4 w-4 mr-2" />
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}