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
  attributes: VariantAttributes; // { Size: "S", Color: "Red" }
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

      // 1) Optionally replace attribute defs for this product
      if (attributes.length) {
        // Remove old attributes/values
        const { error: delValsErr } = await supabase
          .from("product_attribute_values")
          .delete()
          .in(
            "attribute_id",
            (
              await supabase
                .from("product_attributes")
                .select("id")
                .eq("product_id", productId)
            ).data?.map((r: any) => r.id) || []
          );
        if (delValsErr) console.warn("Deleting old attribute values failed (safe to ignore if none)", delValsErr);

        const { error: delAttrsErr } = await supabase
          .from("product_attributes")
          .delete()
          .eq("product_id", productId);
        if (delAttrsErr) console.warn("Deleting old attributes failed (safe to ignore if none)", delAttrsErr);

        // Insert attributes
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

      // 2) Upsert variants by unique (product_id, attributes)
      if (variants.length) {
        const { error: upsertErr } = await supabase
          .from("product_variants")
          .upsert(
            variants.map((v) => ({ ...v, product_id: productId })),
            { onConflict: "product_id,attributes" }
          );
        if (upsertErr) throw upsertErr;
      }

      // 3) Delete variants not in provided set
      const { data: existing, error: exErr } = await supabase
        .from("product_variants")
        .select("id, attributes")
        .eq("product_id", productId);
      if (exErr) throw exErr;

      const providedKeys = new Set(
        variants.map((v) => JSON.stringify(v.attributes))
      );
      const toDelete = (existing || []).filter((row) => !providedKeys.has(JSON.stringify(row.attributes)));
      if (toDelete.length) {
        const { error: delErr } = await supabase
          .from("product_variants")
          .delete()
          .in("id", toDelete.map((r) => r.id));
        if (delErr) throw delErr;
      }

      // 4) Mark product has_variants
      const { error: updProdErr } = await supabase
        .from("products")
        .update({ has_variants: hasVariants })
        .eq("id", productId);
      if (updProdErr) throw updProdErr;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_variants"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Variants saved");
    },
    onError: (err: any) => {
      toast.error("Failed to save variants: " + err.message);
    },
  });

  const clearVariants = useMutation({
    mutationFn: async (productId: string) => {
      const { error: delErr } = await supabase
        .from("product_variants")
        .delete()
        .eq("product_id", productId);
      if (delErr) throw delErr;

      const { error: delValsErr } = await supabase
        .from("product_attribute_values")
        .delete()
        .in(
          "attribute_id",
          (
            await supabase
              .from("product_attributes")
              .select("id")
              .eq("product_id", productId)
          ).data?.map((r: any) => r.id) || []
        );
      if (delValsErr) console.warn(delValsErr);

      const { error: delAttrsErr } = await supabase
        .from("product_attributes")
        .delete()
        .eq("product_id", productId);
      if (delAttrsErr) console.warn(delAttrsErr);

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
      toast.success("Variants cleared");
    },
    onError: (err: any) => {
      toast.error("Failed to clear variants: " + err.message);
    },
  });

  return { variants, isLoading, bulkUpsert, clearVariants };
};
