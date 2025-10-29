-- Apply courier_name column migration
-- Run this in Supabase SQL Editor

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS courier_name TEXT;

COMMENT ON COLUMN public.sales.courier_name IS 'Name of the courier assigned to this sale';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'courier_name';
