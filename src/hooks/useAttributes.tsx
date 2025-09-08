import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReusableAttribute {
  id: string;
  name: string;
  display_name: string;
  type: 'text' | 'select' | 'number' | 'color' | 'size';
  options: string[] | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateAttributeData {
  name: string;
  display_name: string;
  type: 'text' | 'select' | 'number' | 'color' | 'size';
  options?: string[];
  is_required?: boolean;
  sort_order?: number;
}

export interface UpdateAttributeData extends Partial<CreateAttributeData> {
  id: string;
}

export const useAttributes = () => {
  const queryClient = useQueryClient();

  // Fetch all attributes
  const { data: attributes = [], isLoading, error } = useQuery({
    queryKey: ['reusable-attributes'],
    queryFn: async (): Promise<ReusableAttribute[]> => {
      console.log('Fetching reusable attributes...');
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('reusable_attributes')
        .select('*')
        .order('sort_order', { ascending: true });

      const endTime = performance.now();
      console.log(`Attributes fetch took ${endTime - startTime} milliseconds`);

      if (error) {
        console.error('Error fetching attributes:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} attributes:`, data);
      
      // Parse the options JSON string back to array
      const parsedAttributes = (data || []).map(attr => {
        try {
          return {
            ...attr,
            options: attr.options ? JSON.parse(attr.options) : null
          };
        } catch (parseError) {
          console.error(`Error parsing options for attribute ${attr.name}:`, parseError);
          return {
            ...attr,
            options: null
          };
        }
      });
      
      console.log('Parsed attributes:', parsedAttributes);
      return parsedAttributes;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Create attribute
  const createAttribute = useMutation({
    mutationFn: async (data: CreateAttributeData): Promise<ReusableAttribute> => {
      const { data: result, error } = await supabase
        .from('reusable_attributes')
        .insert({
          ...data,
          options: data.options ? JSON.stringify(data.options) : null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Parse the options JSON string back to array
      return {
        ...result,
        options: result.options ? JSON.parse(result.options) : null
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reusable-attributes'] });
      toast.success('Attribute created successfully');
    },
    onError: (error) => {
      console.error('Error creating attribute:', error);
      toast.error('Failed to create attribute');
    },
  });

  // Update product attributes when reusable attribute is updated
  const updateProductAttributes = async (attributeId: string, updateData: Partial<CreateAttributeData>) => {
    // First get the reusable attribute to get its name
    const { data: reusableAttr, error: attrError } = await supabase
      .from('reusable_attributes')
      .select('name')
      .eq('id', attributeId)
      .single();

    if (attrError) {
      console.error('Error fetching reusable attribute:', attrError);
      throw attrError;
    }

    if (!reusableAttr) {
      return; // No reusable attribute found
    }

    // Get all product attributes that use this reusable attribute name, but only for non-deleted products
    const { data: productAttributes, error: fetchError } = await supabase
      .from('product_attributes')
      .select(`
        id, 
        name, 
        product_id,
        products!inner(is_deleted)
      `)
      .eq('name', reusableAttr.name)
      .eq('products.is_deleted', false);

    if (fetchError) {
      console.error('Error fetching product attributes:', fetchError);
      throw fetchError;
    }

    if (!productAttributes || productAttributes.length === 0) {
      return; // No product attributes to update
    }

    // Update each product attribute
    const updatePromises = productAttributes.map(async (productAttr) => {
      const updateFields: any = {};
      
      // Update name if it changed
      if (updateData.name && updateData.name !== productAttr.name) {
        updateFields.name = updateData.name;
      }

      // Update attribute values if options changed
      if (updateData.options && Array.isArray(updateData.options)) {
        // Get existing attribute values for this product attribute
        const { data: existingValues, error: valuesError } = await supabase
          .from('product_attribute_values')
          .select('id, value')
          .eq('attribute_id', productAttr.id);

        if (valuesError) {
          console.error('Error fetching attribute values:', valuesError);
          return;
        }

        const existingValueStrings = existingValues?.map(v => v.value) || [];
        const newOptions = updateData.options;

        // Find values that were renamed (exist in both old and new, but different)
        const renamedValues: { oldValue: string; newValue: string }[] = [];
        const deletedValues: string[] = [];
        const addedValues: string[] = [];

        // Check for renamed values (this is a simple approach - in a real app you might want more sophisticated matching)
        for (const oldValue of existingValueStrings) {
          if (!newOptions.includes(oldValue)) {
            // This value was removed or renamed
            // Try to find a similar value in new options (simple string similarity)
            const similarValue = newOptions.find(newVal => 
              newVal.toLowerCase().includes(oldValue.toLowerCase()) || 
              oldValue.toLowerCase().includes(newVal.toLowerCase())
            );
            
            if (similarValue) {
              renamedValues.push({ oldValue, newValue: similarValue });
            } else {
              deletedValues.push(oldValue);
            }
          }
        }

        // Find truly new values
        for (const newValue of newOptions) {
          if (!existingValueStrings.includes(newValue) && 
              !renamedValues.some(r => r.newValue === newValue)) {
            addedValues.push(newValue);
          }
        }

        // Handle renamed values by updating them
        for (const { oldValue, newValue } of renamedValues) {
          const valueToUpdate = existingValues?.find(v => v.value === oldValue);
          if (valueToUpdate) {
            await supabase
              .from('product_attribute_values')
              .update({ value: newValue })
              .eq('id', valueToUpdate.id);
          }
        }

        // Handle deleted values
        if (deletedValues.length > 0) {
          const valuesToDelete = existingValues?.filter(val => 
            deletedValues.includes(val.value)
          ) || [];

          if (valuesToDelete.length > 0) {
            await supabase
              .from('product_attribute_values')
              .delete()
              .in('id', valuesToDelete.map(v => v.id));
          }
        }

        // Handle added values
        if (addedValues.length > 0) {
          await supabase
            .from('product_attribute_values')
            .insert(
              addedValues.map(value => ({
                attribute_id: productAttr.id,
                value: value
              }))
            );
        }
      }

      // Update the product attribute if there are changes
      if (Object.keys(updateFields).length > 0) {
        await supabase
          .from('product_attributes')
          .update(updateFields)
          .eq('id', productAttr.id);
      }
    });

    await Promise.all(updatePromises);

    // Also update variant attributes JSON for products that use variants
    if (updateData.options && Array.isArray(updateData.options)) {
      await updateVariantAttributes(reusableAttr.name, updateData.options);
    }
  };

  // Update variant attributes JSON when reusable attribute values change
  const updateVariantAttributes = async (attributeName: string, newOptions: string[]) => {
    try {
      // Get all variants that use this attribute
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('id, attributes, product_id, products!inner(is_deleted)')
        .eq('products.is_deleted', false);

      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        return;
      }

      if (!variants || variants.length === 0) {
        return;
      }

      // Filter variants that have this attribute
      const relevantVariants = variants.filter(variant => 
        variant.attributes && 
        typeof variant.attributes === 'object' && 
        attributeName in variant.attributes
      );

      if (relevantVariants.length === 0) {
        return;
      }

      // Update each variant's attributes JSON
      const variantUpdatePromises = relevantVariants.map(async (variant) => {
        const currentAttributes = variant.attributes as Record<string, string>;
        const currentValue = currentAttributes[attributeName];

        // Check if the current value was renamed
        const renamedValue = newOptions.find(newVal => 
          newVal.toLowerCase().includes(currentValue.toLowerCase()) || 
          currentValue.toLowerCase().includes(newVal.toLowerCase())
        );

        if (renamedValue && renamedValue !== currentValue) {
          // Update the variant with the renamed value
          const updatedAttributes = {
            ...currentAttributes,
            [attributeName]: renamedValue
          };

          await supabase
            .from('product_variants')
            .update({ 
              attributes: updatedAttributes,
              updated_at: new Date().toISOString()
            })
            .eq('id', variant.id);
        } else if (!newOptions.includes(currentValue)) {
          // If the current value is not in the new options, remove the attribute
          const updatedAttributes = { ...currentAttributes };
          delete updatedAttributes[attributeName];

          await supabase
            .from('product_variants')
            .update({ 
              attributes: updatedAttributes,
              updated_at: new Date().toISOString()
            })
            .eq('id', variant.id);
        }
      });

      await Promise.all(variantUpdatePromises);
    } catch (error) {
      console.error('Error updating variant attributes:', error);
    }
  };

  // Update attribute
  const updateAttribute = useMutation({
    mutationFn: async (data: UpdateAttributeData): Promise<ReusableAttribute> => {
      const { id, ...updateData } = data;
      
      // First update the reusable attribute
      const { data: result, error } = await supabase
        .from('reusable_attributes')
        .update({
          ...updateData,
          options: updateData.options ? JSON.stringify(updateData.options) : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Then update all associated product attributes
      try {
        await updateProductAttributes(id, updateData);
      } catch (updateError) {
        console.error('Error updating product attributes:', updateError);
        // Don't throw here, just log the error as the main attribute was updated successfully
      }
      
      // Parse the options JSON string back to array
      return {
        ...result,
        options: result.options ? JSON.parse(result.options) : null
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reusable-attributes'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Invalidate products to refresh any cached data
      queryClient.invalidateQueries({ queryKey: ['product-variants'] }); // Invalidate variants to refresh any cached data
      toast.success('Attribute updated successfully');
    },
    onError: (error) => {
      console.error('Error updating attribute:', error);
      toast.error('Failed to update attribute');
    },
  });

  // Check if attribute is used by any products
  const checkAttributeUsage = async (attributeId: string): Promise<{ isUsed: boolean; productCount: number }> => {
    // First get the reusable attribute to get its name
    const { data: reusableAttr, error: attrError } = await supabase
      .from('reusable_attributes')
      .select('name')
      .eq('id', attributeId)
      .single();

    if (attrError) {
      console.error('Error fetching reusable attribute:', attrError);
      throw attrError;
    }

    if (!reusableAttr) {
      return { isUsed: false, productCount: 0 };
    }

    // Now check if any product attributes use this name, but only for non-deleted products
    const { data, error } = await supabase
      .from('product_attributes')
      .select(`
        id, 
        product_id,
        products!inner(is_deleted)
      `)
      .eq('name', reusableAttr.name)
      .eq('products.is_deleted', false);

    if (error) {
      console.error('Error checking attribute usage:', error);
      throw error;
    }

    const uniqueProducts = new Set(data?.map(attr => attr.product_id) || []);
    return {
      isUsed: (data?.length || 0) > 0,
      productCount: uniqueProducts.size
    };
  };

  // Delete attribute
  const deleteAttribute = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // First check if attribute is being used
      const usage = await checkAttributeUsage(id);
      
      if (usage.isUsed) {
        throw new Error(`Cannot delete attribute. It is currently used by ${usage.productCount} product(s).`);
      }

      const { error } = await supabase
        .from('reusable_attributes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reusable-attributes'] });
      toast.success('Attribute deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting attribute:', error);
      toast.error(error.message || 'Failed to delete attribute');
    },
  });

  // Get attributes by type
  const getAttributesByType = (type: string) => {
    return attributes.filter(attr => attr.type === type);
  };

  // Get select attributes (for dropdowns)
  const getSelectAttributes = () => {
    return attributes.filter(attr => attr.type === 'select');
  };

  // Get text attributes
  const getTextAttributes = () => {
    return attributes.filter(attr => attr.type === 'text');
  };

  // Get number attributes
  const getNumberAttributes = () => {
    return attributes.filter(attr => attr.type === 'number');
  };

  // Get color attributes
  const getColorAttributes = () => {
    return attributes.filter(attr => attr.type === 'color');
  };

  // Get size attributes
  const getSizeAttributes = () => {
    return attributes.filter(attr => attr.type === 'size');
  };

  return {
    attributes,
    isLoading,
    error,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    checkAttributeUsage,
    getAttributesByType,
    getSelectAttributes,
    getTextAttributes,
    getNumberAttributes,
    getColorAttributes,
    getSizeAttributes,
  };
};
