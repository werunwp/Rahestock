import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { getCurrencySymbol } from "@/lib/currencySymbols";

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
        .limit(1);

      if (error) {
        throw error;
      }
      
      // Return first row if exists, otherwise default settings
      return data?.[0] as SystemSettings || { ...DEFAULT_SYSTEM_SETTINGS, id: '', created_at: '', updated_at: '' };
    },
    enabled: !!user,
  });

  const updateSystemSettings = useMutation({
    mutationFn: async (updatedData: Partial<SystemSettings>) => {
      // Auto-generate currency symbol if currency code is being updated
      if (updatedData.currency_code) {
        updatedData.currency_symbol = getCurrencySymbol(updatedData.currency_code);
      }

      // First try to update existing settings
      const { data: existingData } = await supabase
        .from("system_settings")
        .select("id")
        .limit(1);

      if (existingData?.[0]?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("system_settings")
          .update(updatedData)
          .eq("id", existingData[0].id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new with auto-generated currency symbol
        const newSettings = { 
          ...DEFAULT_SYSTEM_SETTINGS, 
          ...updatedData,
          currency_symbol: getCurrencySymbol(updatedData.currency_code || DEFAULT_SYSTEM_SETTINGS.currency_code)
        };
        
        const { data, error } = await supabase
          .from("system_settings")
          .insert(newSettings)
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
    systemSettings: systemSettings || { 
      ...DEFAULT_SYSTEM_SETTINGS, 
      id: '', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    },
    isLoading,
    error,
    updateSystemSettings: updateSystemSettings.mutate,
    isUpdating: updateSystemSettings.isPending,
  };
};