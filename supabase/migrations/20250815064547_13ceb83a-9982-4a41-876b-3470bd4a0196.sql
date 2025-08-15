-- Add progress tracking fields to woocommerce_import_logs table
ALTER TABLE public.woocommerce_import_logs 
ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;