import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useEffect } from "react";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  tags: string[];
  order_count: number;
  total_spent: number;
  status: string;
  last_purchase_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateCustomerData {
  name: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  tags?: string[];
  status?: string;
}

export const useCustomers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscriptions for customers and sales
  useEffect(() => {
    if (!user) return;

    const customersChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        () => {
          // Invalidate customers query when customers table changes
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales'
        },
        () => {
          // Invalidate customers query when sales change (affects customer stats)
          queryClient.invalidateQueries({ queryKey: ["customers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(customersChannel);
    };
  }, [user, queryClient]);

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data: customersData, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Since triggers now handle the automatic updates, we just return the data
      // The database will keep order_count, total_spent, and last_purchase_date in sync
      return customersData as Customer[];
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds as backup
  });

  const createCustomer = useMutation({
    mutationFn: async (customerData: CreateCustomerData) => {
      const { data, error } = await supabase
        .from("customers")
        .insert([{ ...customerData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create customer: " + error.message);
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCustomerData> }) => {
      const { data: updated, error } = await supabase
        .from("customers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update customer: " + error.message);
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      // Check if customer has sales records
      const { data: salesRecords, error: salesError } = await supabase
        .from("sales")
        .select("id")
        .eq("customer_id", id)
        .limit(1);
      
      if (salesError) throw salesError;
      
      if (salesRecords && salesRecords.length > 0) {
        throw new Error("Cannot delete customer as they have associated sales records. Consider archiving the customer instead.");
      }
      
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete customer: " + error.message);
    },
  });

  return {
    customers,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};