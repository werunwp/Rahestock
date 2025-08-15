
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface VariantAttributes {
  [key: string]: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  attributes: VariantAttributes;
  sku: string | null;
  rate: number | null;
  cost: number | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttributeDefinition {
  name: string;
  values: string[];
}

export const useProductVariants = (productId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ["product_variants", productId],
    queryFn: async () => {
      if (!productId) return [] as ProductVariant[];
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!user && !!productId,
  });

  const bulkUpsert = useMutation({
    mutationFn: async (params: {
      productId: string;
      hasVariants: boolean;
      attributes?: AttributeDefinition[];
      variants: Omit<ProductVariant, "id" | "created_at" | "updated_at">[];
    }) => {
      const { productId, hasVariants, attributes = [], variants } = params;

      console.log("Bulk upsert called with:", { productId, hasVariants, variants: variants.length });

      // 1) Update product has_variants flag FIRST
      const { error: updProdErr } = await supabase
        .from("products")
        .update({ has_variants: hasVariants })
        .eq("id", productId);
      if (updProdErr) {
        console.error("Error updating product has_variants:", updProdErr);
        throw updProdErr;
      }

      // 2) Handle attributes if provided
      if (attributes.length) {
        // Remove old attributes/values
        const { data: existingAttrs } = await supabase
          .from("product_attributes")
          .select("id")
          .eq("product_id", productId);

        if (existingAttrs && existingAttrs.length > 0) {
          const { error: delValsErr } = await supabase
            .from("product_attribute_values")
            .delete()
            .in("attribute_id", existingAttrs.map((r: any) => r.id));
          if (delValsErr) console.warn("Deleting old attribute values failed:", delValsErr);
        }

        const { error: delAttrsErr } = await supabase
          .from("product_attributes")
          .delete()
          .eq("product_id", productId);
        if (delAttrsErr) console.warn("Deleting old attributes failed:", delAttrsErr);

        // Insert new attributes
        for (const attr of attributes) {
          const { data: attrRow, error: insAttrErr } = await supabase
            .from("product_attributes")
            .insert({ product_id: productId, name: attr.name })
            .select("id")
            .single();
          if (insAttrErr) throw insAttrErr;

          if (attr.values?.length) {
            const vals = attr.values.map((v) => ({ attribute_id: attrRow!.id, value: v }));
            const { error: insValsErr } = await supabase
              .from("product_attribute_values")
              .insert(vals);
            if (insValsErr) throw insValsErr;
          }
        }
      }

      // 3) Handle variants if provided
      if (variants.length > 0) {
        // Delete existing variants for this product first
        const { error: deleteErr } = await supabase
          .from("product_variants")
          .delete()
          .eq("product_id", productId);
        if (deleteErr) console.warn("Error deleting existing variants:", deleteErr);

        // Insert new variants
        const { error: upsertErr } = await supabase
          .from("product_variants")
          .insert(variants.map((v) => ({ ...v, product_id: productId })));
        if (upsertErr) {
          console.error("Error inserting variants:", upsertErr);
          throw upsertErr;
        }
      } else if (!hasVariants) {
        // If no variants and hasVariants is false, delete all variants
        const { error: delErr } = await supabase
          .from("product_variants")
          .delete()
          .eq("product_id", productId);
        if (delErr) console.warn("Error deleting variants:", delErr);
      }

      console.log("Bulk upsert completed successfully");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all_product_variants"] });
      toast.success("Variants saved successfully");
    },
    onError: (err: any) => {
      console.error("Bulk upsert error:", err);
      toast.error("Failed to save variants: " + err.message);
    },
  });

  const clearVariants = useMutation({
    mutationFn: async (productId: string) => {
      // Delete variants
      const { error: delErr } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);
      if (delErr) throw delErr;

      // Delete attribute values and attributes
      const { data: existingAttrs } = await supabase
        .from("product_attributes")
        .select("id")
        .eq("product_id", productId);

      if (existingAttrs && existingAttrs.length > 0) {
        const { error: delValsErr } = await supabase
          .from("product_attribute_values")
          .delete()
          .in("attribute_id", existingAttrs.map((r: any) => r.id));
        if (delValsErr) console.warn(delValsErr);
      }

      const { error: delAttrsErr } = await supabase
        .from("product_attributes")
        .delete()
        .eq("product_id", productId);
      if (delAttrsErr) console.warn(delAttrsErr);

      // Update product to not have variants
      const { error: updProdErr } = await supabase
        .from("products")
        .update({ has_variants: false })
        .eq("id", productId);
      if (updProdErr) throw updProdErr;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["all_product_variants"] });
      toast.success("Variants cleared");
    },
    onError: (err: any) => {
      toast.error("Failed to clear variants: " + err.message);
    },
  });

  return { variants, isLoading, bulkUpsert, clearVariants };
};
