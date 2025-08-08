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

  const isAdmin = userRole?.role === 'admin';
  const isStaff = userRole?.role === 'staff';

  return {
    userRole: userRole?.role,
    isAdmin,
    isStaff,
    isLoading,
    error,
  };
};