-- Add CN (Consignment Number) field to sales table for offline courier tracking
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cn_number TEXT;

COMMENT ON COLUMN public.sales.cn_number IS 'Consignment Number from offline courier (manually entered)';

