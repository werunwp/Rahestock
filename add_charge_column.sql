-- Add charge column to sales table
-- Run this in your Supabase SQL Editor

-- Add the charge column
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS charge numeric DEFAULT 0;

-- Update existing records to have charge = 0
UPDATE public.sales 
SET charge = 0 
WHERE charge IS NULL;

-- Make sure the column is not null with default value
ALTER TABLE public.sales 
ALTER COLUMN charge SET NOT NULL,
ALTER COLUMN charge SET DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' AND column_name = 'charge';
