import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface BusinessSettings {
  id: string;
  business_name: string;
  logo_url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  facebook?: string;
  address?: string;
  invoice_prefix: string;
  invoice_footer_message: string;
  created_at: string;
  updated_at: string;
}

export const useBusinessSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: businessSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["businessSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as BusinessSettings;
    },
    enabled: !!user,
  });

  const updateBusinessSettings = useMutation({
    mutationFn: async (updatedData: Partial<BusinessSettings>) => {
      if (!businessSettings?.id) {
        throw new Error("No business settings found to update");
      }

      const { data, error } = await supabase
        .from("business_settings")
        .update(updatedData)
        .eq("id", businessSettings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessSettings"] });
      toast.success("Business settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update business settings");
      console.error("Error updating business settings:", error);
    },
  });

  return {
    businessSettings,
    isLoading,
    error,
    updateBusinessSettings: updateBusinessSettings.mutate,
    isUpdating: updateBusinessSettings.isPending,
  };
};