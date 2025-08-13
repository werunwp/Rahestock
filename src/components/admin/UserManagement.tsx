import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  // Role Permission Management state
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'staff' | 'viewer'>('staff');
  const [activeTab, setActiveTab] = useState(
    'general' as 'general' | 'products_inventory' | 'sales_invoices' | 'customers' | 'reports' | 'settings' | 'administration'
  );
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  // Permission catalog
  const PERMISSIONS: Record<string, { label: string; key: string; description: string }[]> = {
    general: [
      { key: 'access.dashboard', label: 'Dashboard Access', description: 'Access to the main dashboard overview.' },
      { key: 'access.alerts', label: 'Alerts Access', description: 'View system alerts and notifications.' },
    ],
    products_inventory: [
      { key: 'products.view', label: 'View Products', description: 'View product catalog.' },
      { key: 'products.add', label: 'Add Products', description: 'Create new products.' },
      { key: 'products.edit', label: 'Edit Products', description: 'Modify existing products.' },
      { key: 'products.delete', label: 'Delete Products', description: 'Remove products from catalog.' },
      { key: 'products.import_export', label: 'Import/Export Products', description: 'Import or export product data.' },
      { key: 'inventory.view', label: 'View Inventory', description: 'View stock levels and inventory.' },
      { key: 'inventory.adjust_stock', label: 'Adjust Stock', description: 'Make stock adjustments and log changes.' },
    ],
    sales_invoices: [
      { key: 'sales.view', label: 'View Sales', description: 'View sales history and POS page.' },
      { key: 'sales.create', label: 'Create Sales (POS)', description: 'Create sales via POS.' },
      { key: 'sales.edit', label: 'Edit Sales', description: 'Modify existing sales.' },
      { key: 'sales.delete', label: 'Delete Sales', description: 'Delete or void sales.' },
      { key: 'invoices.view', label: 'View Invoices', description: 'Access and view invoices.' },
      { key: 'invoices.download_print', label: 'Download/Print Invoices', description: 'Download or print invoice PDFs.' },
      { key: 'invoices.export', label: 'Export Invoices', description: 'Export invoice data.' },
    ],
    customers: [
      { key: 'customers.view', label: 'View Customers', description: 'View customer list and details.' },
      { key: 'customers.add', label: 'Add Customers', description: 'Create new customer profiles.' },
      { key: 'customers.edit', label: 'Edit Customers', description: 'Modify customer details.' },
      { key: 'customers.delete', label: 'Delete Customers', description: 'Remove customers.' },
      { key: 'customers.import_export', label: 'Import/Export Customers', description: 'Import or export customers.' },
      { key: 'customers.view_history', label: 'View Customer History', description: 'View purchase history for customers.' },
    ],
    reports: [
      { key: 'reports.view', label: 'View Reports', description: 'Access reports and analytics.' },
      { key: 'reports.export', label: 'Export Reports', description: 'Export report data.' },
    ],
    settings: [
      { key: 'settings.view_business', label: 'View Business Settings', description: 'View business & system settings.' },
      { key: 'settings.edit_business', label: 'Edit Business Settings', description: 'Edit business & system settings.' },
      { key: 'settings.manage_notifications', label: 'Manage Notifications', description: 'Configure notification preferences.' },
      { key: 'settings.manage_appearance', label: 'Manage Appearance', description: 'Change theme and layout preferences.' },
      { key: 'settings.change_password', label: 'Change Password (Self)', description: 'Change own account password.' },
    ],
    administration: [
      { key: 'admin.manage_roles', label: 'Manage User Roles', description: 'Create and edit user roles.' },
      { key: 'admin.manage_permissions', label: 'Manage User Permissions', description: 'Control role-based permissions.' },
      { key: 'admin.full_backup', label: 'Full Data Backup', description: 'Export full system backup.' },
      { key: 'admin.data_restore', label: 'Data Restore', description: 'Restore data from backup.' },
    ],
  };

  const allKeys = Object.values(PERMISSIONS).flat().map(p => p.key);
  const keysByTab = (tab: keyof typeof PERMISSIONS) => PERMISSIONS[tab].map(p => p.key);

  // Load current permissions for the selected role
  const { data: rolePerms, isLoading: permsLoading } = useQuery({
    queryKey: ["role-permissions-editor", selectedRole],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('role_permissions')
        .select('permission_key, allowed')
        .eq('role', selectedRole);
      if (error) throw error;
      return data as { permission_key: string; allowed: boolean }[];
    },
    staleTime: 0,
  });

  // Sync into local toggle state
  const computeDefaults = () => {
    const base: Record<string, boolean> = {};
    allKeys.forEach(k => (base[k] = false));
    rolePerms?.forEach(p => {
      base[p.permission_key] = !!p.allowed;
    });
    return base;
  };

  const [initializedRole, setInitializedRole] = useState<string>('');
  useEffect(() => {
    if (!permsLoading) {
      setToggles(computeDefaults());
      setInitializedRole(selectedRole);
    }
  }, [selectedRole, rolePerms, permsLoading]);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      
      if (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.message || 'Failed to fetch users');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch users');
      }
      
      return data.users as UserProfile[];
    },
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
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

  // Permission save mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(toggles).map(([permission_key, allowed]) => ({
        role: selectedRole,
        permission_key,
        allowed,
      }));
      const { error } = await supabase.from('role_permissions').upsert(payload, { onConflict: 'role,permission_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Permissions updated');
      queryClient.invalidateQueries({ queryKey: ["role-permissions-editor", selectedRole] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions", selectedRole] });
    },
    onError: (e: any) => toast.error(`Failed to save: ${e.message}`)
  });

  const togglePermission = (key: string) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  const allInTabOn = keysByTab(activeTab as keyof typeof PERMISSIONS).every(k => !!toggles[k]);
  const setAllInTab = (value: boolean) => {
    const next = { ...toggles };
    keysByTab(activeTab as keyof typeof PERMISSIONS).forEach(k => { next[k] = value; });
    setToggles(next);
  };

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
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">Error loading users: {error.message}</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}>
                Retry
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No users found</p>
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}>
                Refresh
              </Button>
            </div>
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

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>User Role Permission Management</CardTitle>
            <CardDescription>Control which features each role can access</CardDescription>
          </div>
          <div className="w-full sm:w-64">
            <Label className="sr-only">Role</Label>
            <Select value={selectedRole} onValueChange={(v: 'admin' | 'manager' | 'staff' | 'viewer') => setSelectedRole(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="products_inventory">Products & Inventory</TabsTrigger>
              <TabsTrigger value="sales_invoices">Sales & Invoices</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="administration">Administration</TabsTrigger>
            </TabsList>

            {(['general','products_inventory','sales_invoices','customers','reports','settings','administration'] as const).map((tabKey) => (
              <TabsContent key={tabKey} value={tabKey} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Select all in this tab</div>
                  <Switch checked={allInTabOn} onCheckedChange={(v) => setAllInTab(!!v)} disabled={permsLoading || savePermissionsMutation.isPending} />
                </div>
                <div className="divide-y rounded-md border">
                  {PERMISSIONS[tabKey].map((p) => (
                    <div key={p.key} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-medium cursor-help">{p.label}</div>
                            </TooltipTrigger>
                            <TooltipContent>{p.description}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Switch checked={!!toggles[p.key]} onCheckedChange={() => togglePermission(p.key)} disabled={permsLoading || savePermissionsMutation.isPending} />
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-end">
            <Button onClick={() => savePermissionsMutation.mutate()} disabled={savePermissionsMutation.isPending}>
              {savePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

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