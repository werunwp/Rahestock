-- Fix security warnings by updating function definitions with proper search paths

-- Drop and recreate encrypt function with proper security settings
DROP FUNCTION IF EXISTS public.encrypt_sensitive_data(text);
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

-- Drop and recreate decrypt function with proper security settings
DROP FUNCTION IF EXISTS public.decrypt_sensitive_data(text);
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

-- Drop and recreate upsert function with proper security settings
DROP FUNCTION IF EXISTS public.upsert_woocommerce_connection;
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

-- Drop the security definer view and replace with a function for better security
DROP VIEW IF EXISTS public.woocommerce_connections_secure;

-- Create a function instead of a view for secure access
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

-- Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.get_woocommerce_connection_secure TO authenticated;