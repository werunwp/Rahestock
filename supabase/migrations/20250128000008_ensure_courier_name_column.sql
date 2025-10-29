-- Ensure courier_name column exists in sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS courier_name TEXT;

COMMENT ON COLUMN public.sales.courier_name IS 'Name of the courier assigned to this sale';

