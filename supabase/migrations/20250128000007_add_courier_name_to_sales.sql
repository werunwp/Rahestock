-- Add courier_name field to sales table for tracking courier assignments
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS courier_name TEXT;

COMMENT ON COLUMN public.sales.courier_name IS 'Name of the courier assigned to this sale';

