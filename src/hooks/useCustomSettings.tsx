import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CustomSetting {
  id: string;
  setting_type: 'custom_css' | 'head_snippet' | 'body_snippet';
  content: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useCustomSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: customSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_settings")
        .select("*");

      if (error) {
        throw error;
      }
      
      return data as CustomSetting[];
    },
    enabled: !!user,
  });

  const updateCustomSetting = useMutation({
    mutationFn: async ({ 
      setting_type, 
      content, 
      is_enabled 
    }: { 
      setting_type: CustomSetting['setting_type']; 
      content: string; 
      is_enabled: boolean;
    }) => {
      // First try to update existing setting
      const { data: existingData } = await supabase
        .from("custom_settings")
        .select("id")
        .eq("setting_type", setting_type)
        .maybeSingle();

      if (existingData?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("custom_settings")
          .update({ content, is_enabled })
          .eq("id", existingData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("custom_settings")
          .insert({ setting_type, content, is_enabled })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customSettings"] });
      toast.success("Settings saved");
    },
    onError: (error) => {
      toast.error("Failed to save settings");
      console.error("Error updating custom settings:", error);
    },
  });

  // Helper functions to get specific settings
  const getCustomCSS = () => {
    return customSettings?.find(s => s.setting_type === 'custom_css');
  };

  const getHeadSnippet = () => {
    return customSettings?.find(s => s.setting_type === 'head_snippet');
  };

  const getBodySnippet = () => {
    return customSettings?.find(s => s.setting_type === 'body_snippet');
  };

  return {
    customSettings: customSettings || [],
    getCustomCSS,
    getHeadSnippet,
    getBodySnippet,
    isLoading,
    error,
    updateCustomSetting: updateCustomSetting.mutate,
    isUpdating: updateCustomSetting.isPending,
  };
};