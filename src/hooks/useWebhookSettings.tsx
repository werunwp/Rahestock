import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CourierWebhookSettings {
  id: string;
  webhook_url: string;
  webhook_name: string;
  webhook_description?: string;
  is_active: boolean;
  auth_username?: string;
  auth_password?: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_WEBHOOK_SETTINGS: Omit<CourierWebhookSettings, 'id' | 'created_at' | 'updated_at'> = {
  webhook_url: 'https://n8n.pronirob.com/webhook/send-order-to-pathao',
  webhook_name: 'Courier Webhook',
  webhook_description: 'Default courier delivery webhook',
  is_active: true,
  auth_username: '',
  auth_password: ''
};

export const useWebhookSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: webhookSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courierWebhookSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_webhook_settings")
        .select("*")
        .limit(1);

      if (error) {
        throw error;
      }
      
      // Return first row if exists, otherwise default settings
      return data?.[0] as CourierWebhookSettings || { 
        ...DEFAULT_WEBHOOK_SETTINGS, 
        id: '', 
        created_at: '', 
        updated_at: '' 
      };
    },
    enabled: !!user,
  });

  const updateWebhookSettings = useMutation({
    mutationFn: async (updatedData: Partial<CourierWebhookSettings>) => {
      // First try to update existing settings
      const { data: existingData } = await supabase
        .from("courier_webhook_settings")
        .select("id")
        .limit(1);

      if (existingData?.[0]?.id) {
        // Update existing
        const { data, error } = await supabase
          .from("courier_webhook_settings")
          .update(updatedData)
          .eq("id", existingData[0].id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const newSettings = { 
          ...DEFAULT_WEBHOOK_SETTINGS, 
          ...updatedData
        };
        
        const { data, error } = await supabase
          .from("courier_webhook_settings")
          .insert(newSettings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courierWebhookSettings"] });
      toast.success("Courier webhook settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update courier webhook settings");
      console.error("Error updating courier webhook settings:", error);
    },
  });

  return {
    webhookSettings: webhookSettings || { 
      ...DEFAULT_WEBHOOK_SETTINGS, 
      id: '', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString()
    },
    isLoading,
    error,
    updateWebhookSettings: updateWebhookSettings.mutate,
    isUpdating: updateWebhookSettings.isPending,
  };
};