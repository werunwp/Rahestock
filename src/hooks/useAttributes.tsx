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
      const { data, error } = await supabase
        .from('reusable_attributes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Parse the options JSON string back to array
      return (data || []).map(attr => ({
        ...attr,
        options: attr.options ? JSON.parse(attr.options) : null
      }));
    },
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

  // Update attribute
  const updateAttribute = useMutation({
    mutationFn: async (data: UpdateAttributeData): Promise<ReusableAttribute> => {
      const { id, ...updateData } = data;
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
      
      // Parse the options JSON string back to array
      return {
        ...result,
        options: result.options ? JSON.parse(result.options) : null
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reusable-attributes'] });
      toast.success('Attribute updated successfully');
    },
    onError: (error) => {
      console.error('Error updating attribute:', error);
      toast.error('Failed to update attribute');
    },
  });

  // Delete attribute
  const deleteAttribute = useMutation({
    mutationFn: async (id: string): Promise<void> => {
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
      toast.error('Failed to delete attribute');
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
    getAttributesByType,
    getSelectAttributes,
    getTextAttributes,
    getNumberAttributes,
    getColorAttributes,
    getSizeAttributes,
  };
};
