import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PathaoSettings {
  id: string;
  api_base_url: string;
  access_token: string;
  store_id: number;
  default_delivery_type: number;
  default_item_type: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PATHAO_SETTINGS: Omit<PathaoSettings, 'id' | 'created_at' | 'updated_at'> = {
  api_base_url: 'https://api-hermes.pathao.com',
  access_token: '',
  store_id: 0,
  default_delivery_type: 48,
  default_item_type: 2
};

export const usePathaoSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: pathaoSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pathaoSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pathao_settings")
        .select("*")
        .limit(1);

      if (error) {
        throw error;
      }
      
      // Return first row if exists, otherwise default settings
      return data?.[0] as PathaoSettings || { ...DEFAULT_PATHAO_SETTINGS, id: '', created_at: '', updated_at: '' };
    },
    enabled: !!user,
  });

  const updatePathaoSettings = useMutation({
    mutationFn: async (updatedData: Partial<PathaoSettings>) => {
      // First try to update existing settings
      const { data: existingData } = await supabase
        .from("pathao_settings")
        .select("id")
        .limit(1);

      if (existingData?.[0]?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("pathao_settings")
          .update(updatedData)
          .eq("id", existingData[0].id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const newSettings = { 
          ...DEFAULT_PATHAO_SETTINGS, 
          ...updatedData
        };
        
        const { data, error } = await supabase
          .from("pathao_settings")
          .insert(newSettings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pathaoSettings"] });
      toast.success("Pathao settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update Pathao settings");
      console.error("Error updating Pathao settings:", error);
    },
  });

  return {
    pathaoSettings: pathaoSettings || { 
      ...DEFAULT_PATHAO_SETTINGS, 
      id: '', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    },
    isLoading,
    error,
    updatePathaoSettings: updatePathaoSettings.mutate,
    isUpdating: updatePathaoSettings.isPending,
  };
};