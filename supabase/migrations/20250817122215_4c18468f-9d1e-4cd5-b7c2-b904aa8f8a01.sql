-- Add courier_status column to separate courier tracking from payment status
ALTER TABLE public.sales 
ADD COLUMN courier_status TEXT DEFAULT 'not_sent';

-- Add index for faster lookups by courier status
CREATE INDEX idx_sales_courier_status ON public.sales(courier_status);

-- Update existing records with consignment_id to have 'pending' courier status
UPDATE public.sales 
SET courier_status = 'pending' 
WHERE consignment_id IS NOT NULL;

-- Add comment to document the new column
COMMENT ON COLUMN public.sales.courier_status IS 'Courier delivery status: not_sent, pending, in_transit, out_for_delivery, delivered, returned, lost, partial, etc.';