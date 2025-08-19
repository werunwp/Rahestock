import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface WooCommerceConnection {
  id: string;
  user_id: string;
  site_name: string;
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
  is_active: boolean;
  last_import_at?: string;
  total_products_imported: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWooCommerceConnectionData {
  site_name: string;
  site_url: string;
  consumer_key: string;
  consumer_secret: string;
}

export interface ImportLog {
  id: string;
  connection_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_products: number;
  imported_products: number;
  failed_products: number;
  current_page?: number;
  total_pages?: number;
  error_message?: string;
  progress_message?: string;
  started_at: string;
  completed_at?: string;
}

export const useWooCommerceConnections = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: connections,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["woocommerce-connections", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      // Get connections without decrypted credentials for listing
      const { data, error } = await supabase
        .from("woocommerce_connections")
        .select("id, user_id, site_name, site_url, is_active, last_import_at, total_products_imported, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching WooCommerce connections:", error);
        throw error;
      }
      return data as Omit<WooCommerceConnection, 'consumer_key' | 'consumer_secret'>[];
    },
    enabled: !!user?.id,
  });

  const createConnection = useMutation({
    mutationFn: async (connectionData: CreateWooCommerceConnectionData) => {
      const { data, error } = await supabase.rpc('upsert_woocommerce_connection', {
        p_user_id: user?.id,
        p_site_name: connectionData.site_name,
        p_site_url: connectionData.site_url,
        p_consumer_key: connectionData.consumer_key,
        p_consumer_secret: connectionData.consumer_secret,
        p_is_active: true
      });

      if (error) throw error;
      return { id: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-connections", user?.id] });
      toast.success("WooCommerce connection added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add WooCommerce connection");
      console.error("Error creating WooCommerce connection:", error);
    },
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<WooCommerceConnection> & { id: string }) => {
      const { data, error } = await supabase.rpc('upsert_woocommerce_connection', {
        p_id: id,
        p_user_id: user?.id,
        p_site_name: updateData.site_name,
        p_site_url: updateData.site_url,
        p_consumer_key: updateData.consumer_key,
        p_consumer_secret: updateData.consumer_secret,
        p_is_active: updateData.is_active
      });

      if (error) throw error;
      return { id: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-connections", user?.id] });
      toast.success("WooCommerce connection updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update WooCommerce connection");
      console.error("Error updating WooCommerce connection:", error);
    },
  });

  const deleteConnection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("woocommerce_connections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-connections", user?.id] });
      toast.success("WooCommerce connection deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete WooCommerce connection");
      console.error("Error deleting WooCommerce connection:", error);
    },
  });

  const startImport = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke('woocommerce-import', {
        body: { connectionId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["woocommerce-connections", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["import-logs"] });
      toast.success("Import started successfully");
    },
    onError: (error) => {
      toast.error("Failed to start import");
      console.error("Error starting import:", error);
    },
  });

  return {
    connections,
    isLoading,
    error,
    createConnection: createConnection.mutate,
    isCreating: createConnection.isPending,
    updateConnection: updateConnection.mutate,
    isUpdating: updateConnection.isPending,
    deleteConnection: deleteConnection.mutate,
    isDeleting: deleteConnection.isPending,
    startImport: startImport.mutate,
    isImporting: startImport.isPending,
  };
};

export const useImportLogs = (connectionId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["import-logs", connectionId],
    queryFn: async () => {
      let query = supabase
        .from("woocommerce_import_logs")
        .select(`
          *,
          woocommerce_connections!inner(site_name, site_url)
        `)
        .order("started_at", { ascending: false });

      if (connectionId) {
        query = query.eq("connection_id", connectionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (ImportLog & { woocommerce_connections: { site_name: string; site_url: string } })[];
    },
    enabled: !!user,
    refetchInterval: (query) => {
      // Refetch every 2 seconds if there are any in-progress imports
      const hasInProgress = query.state.data?.some(log => log.status === 'in_progress' || log.status === 'pending');
      return hasInProgress ? 2000 : false;
    },
  });
};