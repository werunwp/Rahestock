import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface SystemSettings {
  id: string;
  currency_symbol: string;
  currency_code: string;
  timezone: string;
  date_format: string;
  time_format: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SYSTEM_SETTINGS: Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'> = {
  currency_symbol: '৳',
  currency_code: 'BDT',
  timezone: 'Asia/Dhaka',
  date_format: 'dd/MM/yyyy',
  time_format: '12h'
};

export const useSystemSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: systemSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      // Return default settings if no settings found
      return data as SystemSettings || { ...DEFAULT_SYSTEM_SETTINGS, id: '', created_at: '', updated_at: '' };
    },
    enabled: !!user,
  });

  const updateSystemSettings = useMutation({
    mutationFn: async (updatedData: Partial<SystemSettings>) => {
      // First try to update existing settings
      const { data: existingData } = await supabase
        .from("system_settings")
        .select("id")
        .limit(1)
        .single();

      if (existingData?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("system_settings")
          .update(updatedData)
          .eq("id", existingData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("system_settings")
          .insert({ ...DEFAULT_SYSTEM_SETTINGS, ...updatedData })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      toast.success("System settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update system settings");
      console.error("Error updating system settings:", error);
    },
  });

  return {
    systemSettings: systemSettings || DEFAULT_SYSTEM_SETTINGS,
    isLoading,
    error,
    updateSystemSettings: updateSystemSettings.mutate,
    isUpdating: updateSystemSettings.isPending,
  };
};