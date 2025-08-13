import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserRole = () => {
  const { user } = useAuth();

  const {
    data: userRole,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user found");
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch role-based permissions for the current user's role
  const { data: rolePermissions } = useQuery({
    queryKey: ["role-permissions", userRole?.role],
    queryFn: async () => {
      if (!userRole?.role) return [] as { permission_key: string; allowed: boolean }[];
      const { data, error } = await (supabase as any)
        .from("role_permissions")
        .select("permission_key, allowed")
        .eq("role", userRole.role);
      if (error) throw error;
      return data as { permission_key: string; allowed: boolean }[];
    },
    enabled: !!userRole?.role,
    staleTime: 30000,
  });

  const isAdmin = userRole?.role === 'admin';
  const isManager = userRole?.role === 'manager';
  const isStaff = userRole?.role === 'staff';
  const isViewer = userRole?.role === 'viewer';

  // Permission helpers (role-based defaults)
  const canManageUsers = isAdmin;
  const canManageBusiness = isAdmin || isManager;
  const canCreateSales = isAdmin || isManager || isStaff;
  const canViewReports = isAdmin || isManager || isStaff || isViewer;
  const isReadOnly = isViewer;

  // Permission checker: admins bypass checks
  const hasPermission = (key: string) => {
    if (isAdmin) return true;
    return !!rolePermissions?.some(p => p.permission_key === key && p.allowed);
  };

  return {
    userRole: userRole?.role,
    isAdmin,
    isManager,
    isStaff,
    isViewer,
    canManageUsers,
    canManageBusiness,
    canCreateSales,
    canViewReports,
    isReadOnly,
    hasPermission,
    isLoading,
    error,
  };
};