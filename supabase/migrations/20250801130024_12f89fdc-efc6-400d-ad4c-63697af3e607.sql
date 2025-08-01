
-- Add status column to customers table
ALTER TABLE public.customers 
ADD COLUMN status text DEFAULT 'inactive';

-- Add check constraint for valid status values
ALTER TABLE public.customers 
ADD CONSTRAINT customers_status_check 
CHECK (status IN ('active', 'neutral', 'inactive'));

-- Add last_purchase_date column to track customer purchase activity
ALTER TABLE public.customers 
ADD COLUMN last_purchase_date timestamp with time zone;
