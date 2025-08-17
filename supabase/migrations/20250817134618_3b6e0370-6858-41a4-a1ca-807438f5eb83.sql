-- Remove old auth header columns and add basic auth columns
ALTER TABLE public.courier_webhook_settings 
DROP COLUMN IF EXISTS auth_header_name,
DROP COLUMN IF EXISTS auth_header_value;

-- Add basic auth columns
ALTER TABLE public.courier_webhook_settings 
ADD COLUMN auth_username TEXT,
ADD COLUMN auth_password TEXT;