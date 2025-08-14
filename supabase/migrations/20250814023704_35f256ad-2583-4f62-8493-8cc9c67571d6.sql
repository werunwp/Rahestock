-- Add missing fields to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#2c7be5',
ADD COLUMN IF NOT EXISTS primary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_email TEXT,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS business_hours TEXT;