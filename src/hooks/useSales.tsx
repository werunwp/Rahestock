import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_whatsapp: string | null;
  customer_address: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  grand_total: number;
  amount_paid: number;
  amount_due: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  total: number;
  created_at: string;
}

export interface CreateSaleData {
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_whatsapp?: string;
  customer_address?: string;
  subtotal: number;
  discount_percent?: number;
  discount_amount?: number;
  grand_total: number;
  amount_paid?: number;
  amount_due?: number;
  payment_method: string;
  payment_status?: string;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    rate: number;
    total: number;
  }[];
}

export const useSales = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: sales = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!user,
  });

  const createSale = useMutation({
    mutationFn: async (saleData: CreateSaleData) => {
      // Generate invoice number
      const { data: invoiceData, error: invoiceError } = await supabase
        .rpc('generate_invoice_number');
      
      if (invoiceError) throw invoiceError;

      const { items, ...saleInfo } = saleData;
      
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([{
          ...saleInfo,
          invoice_number: invoiceData,
          created_by: user?.id
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = items.map(item => ({
        ...item,
        sale_id: sale.id
      }));

      const { error: itemsError } = await supabase
        .from("sales_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of items) {
        // Get current stock first
        const { data: product, error: getError } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (getError) throw getError;

        const newStock = (product.stock_quantity || 0) - item.quantity;
        
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", item.product_id);

        if (stockError) throw stockError;

        // Log inventory change
        const { error: logError } = await supabase
          .from("inventory_logs")
          .insert([{
            product_id: item.product_id,
            type: "sale",
            quantity: -item.quantity,
            reason: `Sale: ${invoiceData}`,
            created_by: user?.id
          }]);

        if (logError) throw logError;
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Sale created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create sale: " + error.message);
    },
  });

  return {
    sales,
    isLoading,
    error,
    createSale,
  };
};