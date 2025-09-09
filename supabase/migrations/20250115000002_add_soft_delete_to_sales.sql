-- Add soft delete functionality to sales table
ALTER TABLE public.sales 
ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance when filtering deleted sales
CREATE INDEX idx_sales_is_deleted ON public.sales(is_deleted);

-- Add comment to document the new columns
COMMENT ON COLUMN public.sales.is_deleted IS 'Soft delete flag for sales records';
COMMENT ON COLUMN public.sales.deleted_at IS 'Timestamp when the sale was soft deleted';
