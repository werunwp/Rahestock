-- Add auth header columns to courier_webhook_settings table
ALTER TABLE public.courier_webhook_settings 
ADD COLUMN IF NOT EXISTS auth_header_name TEXT,
ADD COLUMN IF NOT EXISTS auth_header_value TEXT;