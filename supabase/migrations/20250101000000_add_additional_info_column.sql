-- Add additional_info column to customers table
-- This field can be used for any additional customer information or categorization

-- Add the additional_info column as nullable text field
ALTER TABLE public.customers 
ADD COLUMN additional_info TEXT;

-- Add a comment to explain the purpose of this column
COMMENT ON COLUMN public.customers.additional_info IS 'Additional customer information - free text field for any custom data or categorization needs';
