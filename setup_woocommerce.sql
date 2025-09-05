-- WooCommerce Setup Script
-- Run this AFTER you've successfully created your admin user and enabled RLS
-- This script sets up all WooCommerce integration tables and functions

-- First, check if WooCommerce tables already exist
SELECT 'Checking existing WooCommerce tables:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE 'woocommerce%'
ORDER BY table_name;

-- Create WooCommerce connections table
CREATE TABLE IF NOT EXISTS public.woocommerce_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_import_at TIMESTAMP WITH TIME ZONE,
  total_products_imported INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import logs table for tracking import progress
CREATE TABLE IF NOT EXISTS public.woocommerce_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.woocommerce_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  total_products INTEGER DEFAULT 0,
  imported_products INTEGER DEFAULT 0,
  failed_products INTEGER DEFAULT 0,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER DEFAULT 1,
  error_message TEXT,
  progress_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create live sync settings table
CREATE TABLE IF NOT EXISTS public.woocommerce_live_sync_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.woocommerce_connections(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
  sync_time TIME,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id)
);

-- Create sync logs table
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.woocommerce_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  sync_type TEXT NOT NULL DEFAULT 'manual' CHECK (sync_type IN ('manual', 'automatic')),
  products_synced INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security on all WooCommerce tables
ALTER TABLE public.woocommerce_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_live_sync_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for woocommerce_connections
CREATE POLICY "Users can view their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for woocommerce_import_logs
CREATE POLICY "Users can view their own import logs" 
ON public.woocommerce_import_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_import_logs.connection_id 
    AND wc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own import logs" 
ON public.woocommerce_import_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_import_logs.connection_id 
    AND wc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own import logs" 
ON public.woocommerce_import_logs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_import_logs.connection_id 
    AND wc.user_id = auth.uid()
  )
);

-- Create RLS policies for woocommerce_live_sync_settings
CREATE POLICY "Users can view their own sync settings" 
ON public.woocommerce_live_sync_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_live_sync_settings.connection_id 
    AND wc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own sync settings" 
ON public.woocommerce_live_sync_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_live_sync_settings.connection_id 
    AND wc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own sync settings" 
ON public.woocommerce_live_sync_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_live_sync_settings.connection_id 
    AND wc.user_id = auth.uid()
  )
);

-- Create RLS policies for woocommerce_sync_logs
CREATE POLICY "Users can view their own sync logs" 
ON public.woocommerce_sync_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_sync_logs.connection_id 
    AND wc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own sync logs" 
ON public.woocommerce_sync_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections wc 
    WHERE wc.id = woocommerce_sync_logs.connection_id 
    AND wc.user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all WooCommerce tables
CREATE TRIGGER update_woocommerce_connections_updated_at
    BEFORE UPDATE ON public.woocommerce_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_woocommerce_live_sync_settings_updated_at
    BEFORE UPDATE ON public.woocommerce_live_sync_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create encryption functions for sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Use a consistent encryption key from environment
  -- In production, this should come from a secure key management system
  encryption_key := COALESCE(
    current_setting('app.encryption_key', true),
    'default_encryption_key_change_in_production'
  );
  
  -- Return encrypted data using AES encryption
  RETURN encode(
    encrypt(data::bytea, encryption_key::bytea, 'aes'),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Handle null or empty input
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN encrypted_data;
  END IF;
  
  -- Use the same encryption key
  encryption_key := COALESCE(
    current_setting('app.encryption_key', true),
    'default_encryption_key_change_in_production'
  );
  
  -- Return decrypted data
  RETURN convert_from(
    decrypt(decode(encrypted_data, 'base64'), encryption_key::bytea, 'aes'),
    'UTF8'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, assume it's plain text (for migration purposes)
    RETURN encrypted_data;
END;
$$;

-- Create the upsert function for WooCommerce connections
CREATE OR REPLACE FUNCTION public.upsert_woocommerce_connection(
  p_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_site_name text DEFAULT NULL,
  p_site_url text DEFAULT NULL,
  p_consumer_key text DEFAULT NULL,
  p_consumer_secret text DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Insert or update with encrypted credentials
  INSERT INTO woocommerce_connections (
    id,
    user_id,
    site_name,
    site_url,
    consumer_key,
    consumer_secret,
    is_active,
    updated_at
  )
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_user_id,
    p_site_name,
    p_site_url,
    CASE WHEN p_consumer_key IS NOT NULL THEN encrypt_sensitive_data(p_consumer_key) ELSE NULL END,
    CASE WHEN p_consumer_secret IS NOT NULL THEN encrypt_sensitive_data(p_consumer_secret) ELSE NULL END,
    p_is_active,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    site_name = COALESCE(EXCLUDED.site_name, woocommerce_connections.site_name),
    site_url = COALESCE(EXCLUDED.site_url, woocommerce_connections.site_url),
    consumer_key = CASE 
      WHEN EXCLUDED.consumer_key IS NOT NULL 
      THEN EXCLUDED.consumer_key 
      ELSE woocommerce_connections.consumer_key 
    END,
    consumer_secret = CASE 
      WHEN EXCLUDED.consumer_secret IS NOT NULL 
      THEN EXCLUDED.consumer_secret 
      ELSE woocommerce_connections.consumer_secret 
    END,
    is_active = COALESCE(EXCLUDED.is_active, woocommerce_connections.is_active),
    updated_at = now()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$;

-- Create function for secure access to connection details
CREATE OR REPLACE FUNCTION public.get_woocommerce_connection_secure(connection_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  site_name text,
  site_url text,
  consumer_key text,
  consumer_secret text,
  is_active boolean,
  last_import_at timestamp with time zone,
  total_products_imported integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user owns this connection
  IF NOT EXISTS (
    SELECT 1 FROM woocommerce_connections wc 
    WHERE wc.id = connection_id AND wc.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You can only access your own connections';
  END IF;

  RETURN QUERY
  SELECT 
    wc.id,
    wc.user_id,
    wc.site_name,
    wc.site_url,
    decrypt_sensitive_data(wc.consumer_key) as consumer_key,
    decrypt_sensitive_data(wc.consumer_secret) as consumer_secret,
    wc.is_active,
    wc.last_import_at,
    wc.total_products_imported,
    wc.created_at,
    wc.updated_at
  FROM woocommerce_connections wc
  WHERE wc.id = connection_id;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.upsert_woocommerce_connection TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_woocommerce_connection_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_sensitive_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_sensitive_data TO authenticated;

-- Verify the final structure
SELECT 'WooCommerce tables created:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE 'woocommerce%'
ORDER BY table_name;

-- Check RLS status
SELECT 'RLS Status:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND table_name LIKE 'woocommerce%'
ORDER BY table_name;

-- Check functions
SELECT 'Functions created:' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%woocommerce%'
ORDER BY routine_name;

-- Final verification
SELECT 'WooCommerce setup complete! You can now add WooCommerce connections.' as status;
SELECT 'All tables, functions, and RLS policies are in place.' as note;
