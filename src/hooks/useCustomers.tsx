import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { toast } from "@/utils/toast";
import { useEffect } from "react";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  tags: string[];
  order_count: number;
  delivered_count: number;
  cancelled_count: number;
  total_spent: number;
  status: string;
  additional_info: string | null;
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
  additional_info?: string;
}

export const useCustomers = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
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

      // Dynamically compute customer stats from sales to ensure up-to-date values
      // Fetch minimal sales fields and aggregate on the client grouped by customer_id
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("customer_id, grand_total, created_at, payment_status, courier_status")
        .in(
          "customer_id",
          (customersData || []).map((c) => c.id)
        );

      if (salesError) throw salesError;

      const customerIdToStats: Record<string, {
        orderCount: number;
        deliveredCount: number;
        cancelledCount: number;
        totalSpent: number;
        lastPurchaseDate: string | null;
      }> = {};

      (salesData || []).forEach((sale) => {
        const key = sale.customer_id as string;
        if (!customerIdToStats[key]) {
          customerIdToStats[key] = {
            orderCount: 0,
            deliveredCount: 0,
            cancelledCount: 0,
            totalSpent: 0,
            lastPurchaseDate: null,
          };
        }

        const stats = customerIdToStats[key];
        stats.orderCount += 1;
        if ((sale as any).courier_status === "delivered") {
          stats.deliveredCount += 1;
          stats.totalSpent += Number(sale.grand_total) || 0;
          if (
            !stats.lastPurchaseDate ||
            new Date(sale.created_at) > new Date(stats.lastPurchaseDate)
          ) {
            stats.lastPurchaseDate = sale.created_at as string;
          }
        } else if ((sale as any).courier_status === "cancelled") {
          stats.cancelledCount += 1;
        }
      });

      const merged = (customersData as Customer[]).map((c) => {
        const s = customerIdToStats[c.id] || {
          orderCount: 0,
          deliveredCount: 0,
          cancelledCount: 0,
          totalSpent: 0,
          lastPurchaseDate: null,
        };
        return {
          ...c,
          order_count: s.orderCount,
          delivered_count: s.deliveredCount,
          cancelled_count: s.cancelledCount,
          total_spent: s.totalSpent,
          last_purchase_date: s.lastPurchaseDate,
        } as Customer;
      });

      return merged;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
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
      // Check if user is admin
      if (!isAdmin) {
        throw new Error("Only administrators can delete customers");
      }
      
      // First, delete all associated sales records
      const { error: salesError } = await supabase
        .from("sales")
        .delete()
        .eq("customer_id", id);
      
      if (salesError) {
        console.warn("Error deleting associated sales:", salesError);
        // Continue with customer deletion even if sales deletion fails
      }
      
      // Then delete the customer
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Remove and refetch all related queries to ensure fresh data
      queryClient.removeQueries({ queryKey: ["customers"] });
      queryClient.removeQueries({ queryKey: ["sales"] });
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      queryClient.removeQueries({ queryKey: ["reports"] });
      
      // Small delay to ensure database has processed the deletion
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["customers"] });
        queryClient.refetchQueries({ queryKey: ["sales"] });
      }, 100);
      
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete customer: " + error.message);
    },
  });


  const updateCustomerStats = useMutation({
    mutationFn: async (showNotification: boolean = true) => {
      // Get all customers and update their statistics with new columns
      const { data: customers, error: customersError } = await supabase
        .from("customers")
        .select("id");

      if (customersError) throw customersError;

      // For each customer, recalculate their statistics
      const updatePromises = customers.map(async (customer) => {
        // Get all sales for this customer
        const { data: allSales, error: salesError } = await supabase
          .from("sales")
          .select("grand_total, created_at, payment_status, amount_paid")
          .eq("customer_id", customer.id);

        if (salesError) throw salesError;

        // Filter for paid sales (only payment_status = 'paid')
        const paidSales = allSales?.filter(sale => 
          sale.payment_status === 'paid'
        ) || [];

        // Filter for cancelled orders
        const cancelledOrders = allSales?.filter(sale => 
          sale.payment_status === 'cancelled'
        ) || [];

        const orderCount = allSales?.length || 0; // Total orders count (all orders)
        const deliveredCount = paidSales.length; // Delivered = Paid orders count
        const cancelledCount = cancelledOrders.length; // Cancelled orders count
        const totalSpent = paidSales.reduce((sum, sale) => sum + sale.grand_total, 0); // Paid orders total
        const lastPurchaseDate = paidSales.length > 0 
          ? paidSales.reduce((latest, sale) => 
              new Date(sale.created_at) > new Date(latest.created_at) ? sale : latest
            ).created_at
          : null;

        // Update customer statistics - only update existing columns for now
        const updateData: any = {
          order_count: orderCount,
          total_spent: totalSpent,
          last_purchase_date: lastPurchaseDate,
          updated_at: new Date().toISOString()
        };

        // Try to update with new columns, fall back to basic columns if they don't exist
        try {
          const { error: updateError } = await supabase
            .from("customers")
            .update({
              ...updateData,
              delivered_count: deliveredCount,
              cancelled_count: cancelledCount,
            })
            .eq("id", customer.id);

          if (updateError) {
            // If new columns don't exist, update without them
            console.log("New columns don't exist, updating basic columns only");
            const { error: basicUpdateError } = await supabase
              .from("customers")
              .update(updateData)
              .eq("id", customer.id);
            
            if (basicUpdateError) throw basicUpdateError;
          }
        } catch (error) {
          // Fallback to basic update
          const { error: basicUpdateError } = await supabase
            .from("customers")
            .update(updateData)
            .eq("id", customer.id);
          
          if (basicUpdateError) throw basicUpdateError;
        }
      });

      await Promise.all(updatePromises);
      return { updatedCount: customers.length };
    },
    onSuccess: (data, showNotification) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (showNotification) {
        toast.success(`Updated statistics for ${data.updatedCount} customers`);
      }
    },
    onError: (error) => {
      console.error("Error updating customer statistics:", error);
      toast.error("Failed to update customer statistics: " + error.message);
    },
  });

  return {
    customers,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    updateCustomerStats: updateCustomerStats.mutate,
    isUpdatingStats: updateCustomerStats.isPending,
  };
};