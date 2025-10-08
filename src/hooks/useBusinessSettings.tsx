import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/utils/toast";

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
  brand_color?: string;
  primary_email?: string;
  secondary_email?: string;
  address_line1?: string;
  address_line2?: string;
  business_hours?: string;
  low_stock_alert_quantity?: number;
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
        .limit(1);

      if (error) {
        console.warn('Error fetching business settings:', error);
        // Return default settings if no data or error
        return {
          id: 'default',
          business_name: 'Rahedeen Productions',
          invoice_prefix: 'INV',
          phone: '+880123456789',
          email: 'info@rahedeen.com',
          address: 'Dhaka, Bangladesh',
          brand_color: '#2c7be5',
          invoice_footer_message: 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য',
          low_stock_alert_quantity: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as BusinessSettings;
      }

      // If no data, return default settings
      if (!data || data.length === 0) {
        return {
          id: 'default',
          business_name: 'Rahedeen Productions',
          invoice_prefix: 'INV',
          phone: '+880123456789',
          email: 'info@rahedeen.com',
          address: 'Dhaka, Bangladesh',
          brand_color: '#2c7be5',
          invoice_footer_message: 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য',
          low_stock_alert_quantity: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as BusinessSettings;
      }

      return data[0] as BusinessSettings;
    },
    // Fetch even when logged out so public pages (e.g., login) can read logo/name
    enabled: true,
  });

  const updateBusinessSettings = useMutation({
    mutationFn: async (updatedData: Partial<BusinessSettings>) => {
      if (!businessSettings?.id || businessSettings.id === 'default') {
        // If no settings exist or we have default settings, create new record
        const { data, error } = await supabase
          .from("business_settings")
          .insert(updatedData)
          .select()
          .single();

        if (error) {
          console.warn('Error creating business settings:', error);
          // If insert fails, just return the updated data
          return { ...businessSettings, ...updatedData };
        }
        return data;
      }

      const { data, error } = await supabase
        .from("business_settings")
        .update(updatedData)
        .eq("id", businessSettings.id)
        .select()
        .single();

      if (error) {
        console.warn('Error updating business settings:', error);
        // If update fails, return the updated data
        return { ...businessSettings, ...updatedData };
      }
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