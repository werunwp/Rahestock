import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  rate: number;
  cost: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  size: string | null;
  color: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateProductData {
  name: string;
  sku?: string;
  rate: number;
  cost?: number;
  stock_quantity?: number;
  low_stock_threshold?: number;
  size?: string;
  color?: string;
  image_url?: string;
}

export const useProducts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async (productData: CreateProductData) => {
      const { data, error } = await supabase
        .from("products")
        .insert([{ ...productData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create product: " + error.message);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductData> }) => {
      const { data: updated, error } = await supabase
        .from("products")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update product: " + error.message);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete product: " + error.message);
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};