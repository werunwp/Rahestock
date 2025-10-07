-- Add customer_size column to customers table
-- This field can be used to categorize customers by size, type, or business model

-- Add the customer_size column
ALTER TABLE public.customers 
ADD COLUMN customer_size TEXT DEFAULT 'medium';

-- Add a comment to explain the purpose of this column
COMMENT ON COLUMN public.customers.customer_size IS 'Customer size/type categorization (small, medium, large, enterprise, wholesale, retail)';

-- Update existing customers to have a default value
UPDATE public.customers 
SET customer_size = 'medium' 
WHERE customer_size IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE public.customers 
ALTER COLUMN customer_size SET NOT NULL;
