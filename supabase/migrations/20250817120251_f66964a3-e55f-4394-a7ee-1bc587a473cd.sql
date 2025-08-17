
-- Add columns to sales table for tracking Pathao order information
ALTER TABLE public.sales 
ADD COLUMN consignment_id TEXT,
ADD COLUMN order_status TEXT DEFAULT 'pending',
ADD COLUMN last_status_check TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups by consignment_id
CREATE INDEX idx_sales_consignment_id ON public.sales(consignment_id) WHERE consignment_id IS NOT NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN public.sales.consignment_id IS 'Pathao consignment ID returned from courier webhook';
COMMENT ON COLUMN public.sales.order_status IS 'Current order status from courier service (pending, in_transit, delivered, etc.)';
COMMENT ON COLUMN public.sales.last_status_check IS 'Timestamp of last status check with courier service';
