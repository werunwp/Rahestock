import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profileData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Fetch profile and user role in parallel
      const [profileResponse, roleResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
      ]);

      if (profileResponse.error) throw profileResponse.error;
      if (roleResponse.error) throw roleResponse.error;

      return {
        profile: profileResponse.data,
        role: roleResponse.data?.role || 'staff'
      };
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { full_name?: string; phone?: string; email?: string }) => {
      if (!user?.id) throw new Error("No user found");

      const { email, ...profileUpdates } = updates;
      
      // Only update email if it's different from current email
      if (email && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
      }

      // Handle profile updates - check if profile exists first
      if (Object.keys(profileUpdates).length > 0) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile
          const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdates)
            .eq("user_id", user.id);
          
          if (profileError) throw profileError;
        } else {
          // Create new profile
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              user_id: user.id,
              ...profileUpdates
            });
          
          if (profileError) throw profileError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    },
  });

  return {
    profile: profileData?.profile,
    role: profileData?.role,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
  };
};