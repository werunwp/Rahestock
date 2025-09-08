
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
      if (attributes && attributes.length > 0) {
        console.log("Processing attributes for product:", productId, "Attributes:", attributes);
        
        // Validate attributes before processing
        const validAttributes = attributes.filter(attr => 
          attr.name && attr.name.trim() && 
          (!attr.values || Array.isArray(attr.values))
        );
        
        if (validAttributes.length === 0) {
          console.warn("No valid attributes provided");
          return true;
        }
        
        console.log("Valid attributes to process:", validAttributes);

        // Get existing attributes with their values
        console.log(`Fetching existing attributes for product: ${productId}`);
        const { data: existingAttrs, error: existingAttrsError } = await supabase
          .from("product_attributes")
          .select(`
            id,
            name,
            product_attribute_values (
              id,
              value
            )
          `)
          .eq("product_id", productId);

        if (existingAttrsError) {
          console.error("Error fetching existing attributes:", existingAttrsError);
          throw new Error(`Failed to fetch existing attributes: ${existingAttrsError.message}`);
        }

        console.log(`Found ${existingAttrs?.length || 0} existing attributes:`, existingAttrs);

        // Create a map of existing attributes for quick lookup (case-insensitive)
        const existingAttrsMap = new Map(
          existingAttrs?.map(attr => [
            attr.name.toLowerCase().trim(), 
            {
              id: attr.id,
              name: attr.name, // Keep original name for reference
              existingValues: new Set(attr.product_attribute_values?.map((v: any) => v.value) || [])
            }
          ]) || []
        );
        
        console.log(`Created existingAttrsMap with keys:`, Array.from(existingAttrsMap.keys()));

        // Process each attribute
        for (const attr of validAttributes) {
          try {
            const normalizedAttrName = attr.name.toLowerCase().trim();
            console.log(`Processing attribute: "${attr.name}" (normalized: "${normalizedAttrName}")`);
            const existingAttr = existingAttrsMap.get(normalizedAttrName) as any;
            console.log(`Existing attribute lookup result:`, existingAttr);
            let attrId = existingAttr?.id;

            if (!existingAttr) {
              // Create new attribute
              console.log(`Creating new attribute: ${attr.name} for product: ${productId}`);
              
              const { data: attrRow, error: insAttrErr } = await supabase
                .from("product_attributes")
                .insert({ product_id: productId, name: attr.name })
                .select("id")
                .single();
              
              if (insAttrErr) {
                console.error(`Failed to create attribute ${attr.name}:`, insAttrErr);
                // Check if it's a duplicate key error
                if (insAttrErr.code === '23505') {
                  console.log(`Attribute ${attr.name} already exists, fetching existing ID...`);
                  // Try to fetch the existing attribute
                  const { data: existingAttrData, error: fetchErr } = await supabase
                    .from("product_attributes")
                    .select("id")
                    .eq("product_id", productId)
                    .eq("name", attr.name)
                    .single();
                  
                  if (fetchErr) {
                    console.warn(`Failed to fetch existing attribute '${attr.name}': ${fetchErr.message}`);
                    // Try one more time with a different approach - refresh the map
                    console.log(`Refreshing attributes map and retrying...`);
                    const { data: refreshedAttrs } = await supabase
                      .from("product_attributes")
                      .select("id, name")
                      .eq("product_id", productId);
                    
                    const refreshedAttr = refreshedAttrs?.find(a => 
                      a.name.toLowerCase().trim() === normalizedAttrName
                    );
                    
                    if (refreshedAttr) {
                      attrId = refreshedAttr.id;
                      console.log(`Found attribute ${attr.name} after refresh with ID: ${attrId}`);
                    } else {
                      console.warn(`Still cannot find attribute '${attr.name}', skipping`);
                      continue;
                    }
                  } else {
                    attrId = existingAttrData.id;
                    console.log(`Found existing attribute ${attr.name} with ID: ${attrId}`);
                  }
                } else {
                  console.warn(`Failed to create attribute '${attr.name}': ${insAttrErr.message}`);
                  // Skip this attribute instead of throwing an error
                  continue;
                }
              } else {
                attrId = attrRow.id;
                console.log(`Successfully created attribute ${attr.name} with ID: ${attrId}`);
              }
            } else {
              console.log(`Attribute ${attr.name} already exists with ID: ${attrId}`);
            }

            // Handle attribute values
            if (attr.values?.length && attrId) {
              // Filter out values that already exist
              const newValues = attr.values.filter(value => 
                !(existingAttr?.existingValues as Set<string>)?.has(value)
              );

              if (newValues.length > 0) {
                console.log(`Adding ${newValues.length} new values for attribute ${attr.name}:`, newValues);
                const vals = newValues.map((v) => ({ attribute_id: attrId, value: v }));
                const { error: insValsErr } = await supabase
                  .from("product_attribute_values")
                  .insert(vals);
                if (insValsErr) {
                  console.error(`Failed to create attribute values for ${attr.name}:`, insValsErr);
                  // Check if it's a duplicate key error - if so, just log and continue
                  if (insValsErr.code === '23505') {
                    console.log(`Some values for attribute ${attr.name} already exist, skipping duplicates`);
                  } else {
                    console.warn(`Failed to create attribute values for '${attr.name}': ${insValsErr.message}`);
                    // Continue processing instead of throwing an error
                  }
                } else {
                  console.log(`Successfully added new values for attribute ${attr.name}`);
                }
              } else {
                console.log(`All values for attribute ${attr.name} already exist, skipping`);
              }
            }
          } catch (error) {
            console.error(`Error processing attribute ${attr.name}:`, error);
            // Log the error but continue processing other attributes
            console.warn(`Skipping attribute ${attr.name} due to error:`, error);
          }
        }
      }

      // 3) Handle variants if provided
      if (variants.length > 0) {
        // Deduplicate variants by attributes before upserting
        const uniqueVariants = Array.from(
          new Map(
            variants.map(v => [JSON.stringify(v.attributes), { ...v, product_id: productId }])
          ).values()
        );

        // Get existing variants to preserve woocommerce fields
        const { data: existingVariants } = await supabase
          .from("product_variants")
          .select("id, woocommerce_id, woocommerce_connection_id, attributes")
          .eq("product_id", productId);

        // Create a map of existing variants by attributes for quick lookup
        const existingVariantsMap = new Map(
          existingVariants?.map((v: any) => [JSON.stringify(v.attributes), v]) || []
        );

        // Prepare variants for upsert, preserving woocommerce fields where possible
        const variantsToUpsert = uniqueVariants.map(variant => {
          const existingVariant = existingVariantsMap.get(JSON.stringify(variant.attributes)) as any;
          return {
            ...variant,
            // Preserve woocommerce fields if they exist
            woocommerce_id: existingVariant?.woocommerce_id || null,
            woocommerce_connection_id: existingVariant?.woocommerce_connection_id || null,
            // Only include id if updating existing variant
            ...(existingVariant?.id && { id: existingVariant.id })
          };
        });

        // Delete variants that are no longer needed (not in the new list)
        const newAttributeKeys = new Set(uniqueVariants.map(v => JSON.stringify(v.attributes)));
        const variantsToDelete = existingVariants?.filter((v: any) => 
          !newAttributeKeys.has(JSON.stringify(v.attributes))
        ) || [];

        if (variantsToDelete.length > 0) {
          const { error: deleteErr } = await supabase
            .from("product_variants")
            .delete()
            .in("id", variantsToDelete.map(v => v.id));
          if (deleteErr) console.warn("Error deleting obsolete variants:", deleteErr);
        }

        // Upsert variants (insert new ones, update existing ones)
        const { error: upsertErr } = await supabase
          .from("product_variants")
          .upsert(variantsToUpsert, {
            onConflict: 'id',
            ignoreDuplicates: false
          });
        if (upsertErr) {
          console.error("Error upserting variants:", upsertErr);
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
