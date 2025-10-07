-- Add customer_size column to customers table
-- This field can be used to categorize customers by size, type, or business model

-- Add the customer_size column as nullable text field
ALTER TABLE public.customers 
ADD COLUMN customer_size TEXT;

-- Add a comment to explain the purpose of this column
COMMENT ON COLUMN public.customers.customer_size IS 'Custom customer size/type categorization - free text field for any categorization needs';
