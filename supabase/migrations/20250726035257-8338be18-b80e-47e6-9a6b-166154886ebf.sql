-- First, let's see what the current constraint is
-- Drop the existing constraint if it exists
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_type_check;

-- Add the correct constraint that allows 'in' and 'out' values
ALTER TABLE public.inventory_logs 
ADD CONSTRAINT inventory_logs_type_check 
CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'purchase', 'return'));