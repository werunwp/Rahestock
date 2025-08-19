-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_sensitive_data(data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create a function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_sensitive_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create a view for secure access to WooCommerce connections
CREATE OR REPLACE VIEW public.woocommerce_connections_secure AS
SELECT 
  id,
  user_id,
  site_name,
  site_url,
  decrypt_sensitive_data(consumer_key) as consumer_key,
  decrypt_sensitive_data(consumer_secret) as consumer_secret,
  is_active,
  last_import_at,
  total_products_imported,
  created_at,
  updated_at
FROM public.woocommerce_connections;

-- Create a function to safely insert/update WooCommerce connections
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
AS $$
DECLARE
  result_id uuid;
BEGIN
  -- Insert or update with encrypted credentials
  INSERT INTO public.woocommerce_connections (
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

-- Grant necessary permissions
GRANT SELECT ON public.woocommerce_connections_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_woocommerce_connection TO authenticated;

-- Encrypt existing plain text credentials
UPDATE public.woocommerce_connections 
SET 
  consumer_key = encrypt_sensitive_data(consumer_key),
  consumer_secret = encrypt_sensitive_data(consumer_secret),
  updated_at = now()
WHERE 
  consumer_key IS NOT NULL 
  AND consumer_secret IS NOT NULL
  -- Only encrypt if they appear to be plain text (not already base64 encoded)
  AND consumer_key !~ '^[A-Za-z0-9+/]*={0,2}$';