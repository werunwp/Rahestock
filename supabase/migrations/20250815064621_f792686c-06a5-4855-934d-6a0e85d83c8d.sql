-- Add woocommerce_connection_id to product_variants table for better tracking
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS woocommerce_connection_id UUID REFERENCES public.woocommerce_connections(id);