import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

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

      // Update customer status based on last purchase date and sales data
      const updatedCustomers = await Promise.all(
        (customersData || []).map(async (customer) => {
          // Get the latest sale for this customer
          const { data: latestSale } = await supabase
            .from("sales")
            .select("created_at")
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastPurchaseDate = latestSale?.created_at;
          let calculatedStatus = customer.status;

          if (lastPurchaseDate) {
            const daysSinceLastPurchase = Math.floor(
              (new Date().getTime() - new Date(lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Calculate what the status should be based on purchase history
            let autoStatus: string;
            if (daysSinceLastPurchase <= 30) {
              autoStatus = "active";
            } else if (daysSinceLastPurchase <= 60) {
              autoStatus = "neutral";
            } else {
              autoStatus = "inactive";
            }

            // Only update status automatically if last_purchase_date changed or no manual update in last 5 minutes
            const customerUpdatedAt = new Date(customer.updated_at).getTime();
            const fiveMinutesAgo = new Date().getTime() - (5 * 60 * 1000);
            const isRecentManualUpdate = customerUpdatedAt > fiveMinutesAgo;

            // Update only if purchase date changed and no recent manual update, or if it's the first time setting the date
            if (lastPurchaseDate !== customer.last_purchase_date && !isRecentManualUpdate) {
              calculatedStatus = autoStatus;
              
              await supabase
                .from("customers")
                .update({ 
                  last_purchase_date: lastPurchaseDate 
                })
                .eq("id", customer.id);
            }
          }

          return {
            ...customer,
            status: calculatedStatus,
            last_purchase_date: lastPurchaseDate
          } as Customer;
        })
      );

      return updatedCustomers;
    },
    enabled: !!user,
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