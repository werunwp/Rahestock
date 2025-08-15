-- Add soft delete functionality to products table
ALTER TABLE public.products 
ADD COLUMN is_deleted boolean NOT NULL DEFAULT false,
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance when filtering deleted products
CREATE INDEX idx_products_is_deleted ON public.products(is_deleted);

-- Update the existing delete product constraint check in useProducts
-- Since we're doing soft deletes, we no longer need to prevent deletion based on sales items