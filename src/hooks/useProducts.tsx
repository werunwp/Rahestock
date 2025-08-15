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
  has_variants: boolean; 
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
  has_variants?: boolean;
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
      // Check if product has sales items
      const { data: salesItems, error: salesError } = await supabase
        .from("sales_items")
        .select("id")
        .eq("product_id", id)
        .limit(1);
      
      if (salesError) throw salesError;
      
      if (salesItems && salesItems.length > 0) {
        throw new Error("Cannot delete product as it has been sold. Consider setting stock to 0 instead.");
      }
      
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

  const duplicateProduct = useMutation({
    mutationFn: async (productId: string) => {
      // First, get the original product
      const { data: originalProduct, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      // Generate new SKU for the duplicated product
      const base = (originalProduct.sku || '').toString().trim();
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const newSku = `${base ? base : 'SKU'}-${suffix}`;

      // Create the new product
      const { data: newProduct, error: createError } = await supabase
        .from("products")
        .insert([{
          name: `${originalProduct.name} (duplicated)`,
          sku: newSku,
          rate: originalProduct.rate,
          cost: originalProduct.cost,
          stock_quantity: originalProduct.stock_quantity,
          low_stock_threshold: originalProduct.low_stock_threshold,
          size: originalProduct.size,
          color: originalProduct.color,
          image_url: originalProduct.image_url,
          has_variants: originalProduct.has_variants,
          created_by: user?.id
        }])
        .select()
        .single();

      if (createError) throw createError;

      // If the original product has variants, duplicate them too
      if (originalProduct.has_variants) {
        const { data: originalVariants, error: variantsError } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", productId);

        if (variantsError) throw variantsError;

        if (originalVariants && originalVariants.length > 0) {
          const newVariants = originalVariants.map(variant => ({
            product_id: newProduct.id,
            attributes: variant.attributes,
            rate: variant.rate,
            cost: variant.cost,
            stock_quantity: variant.stock_quantity,
            low_stock_threshold: variant.low_stock_threshold,
            sku: variant.sku ? `${variant.sku}-${suffix}` : null,
            image_url: variant.image_url
          }));

          const { error: createVariantsError } = await supabase
            .from("product_variants")
            .insert(newVariants);

          if (createVariantsError) throw createVariantsError;
        }
      }

      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all_product_variants"] });
      toast.success("Product duplicated successfully with all variants");
    },
    onError: (error) => {
      toast.error("Failed to duplicate product: " + error.message);
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
  };
};