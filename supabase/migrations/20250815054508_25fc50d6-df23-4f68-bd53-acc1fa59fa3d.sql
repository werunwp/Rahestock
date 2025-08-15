-- Add columns to products table for WooCommerce tracking
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS woocommerce_id INTEGER,
ADD COLUMN IF NOT EXISTS woocommerce_connection_id UUID REFERENCES public.woocommerce_connections(id),
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add columns to product_variants table for WooCommerce tracking
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS woocommerce_id INTEGER,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Add progress_message column to import logs
ALTER TABLE public.woocommerce_import_logs 
ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- Create sync schedules table
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.woocommerce_connections(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 60,
  sync_time TIME,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sync schedules
ALTER TABLE public.woocommerce_sync_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for sync schedules
CREATE POLICY "Users can view their own sync schedules" 
ON public.woocommerce_sync_schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections 
    WHERE id = connection_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own sync schedules" 
ON public.woocommerce_sync_schedules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections 
    WHERE id = connection_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own sync schedules" 
ON public.woocommerce_sync_schedules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections 
    WHERE id = connection_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own sync schedules" 
ON public.woocommerce_sync_schedules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections 
    WHERE id = connection_id AND user_id = auth.uid()
  )
);

-- Create sync logs table
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.woocommerce_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
  products_updated INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- Enable RLS on sync logs
ALTER TABLE public.woocommerce_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync logs
CREATE POLICY "Users can view their own sync logs" 
ON public.woocommerce_sync_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections 
    WHERE id = connection_id AND user_id = auth.uid()
  )
);

-- Add trigger for updated_at on sync schedules
CREATE TRIGGER update_woocommerce_sync_schedules_updated_at
BEFORE UPDATE ON public.woocommerce_sync_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_woocommerce_id ON public.products(woocommerce_id);
CREATE INDEX IF NOT EXISTS idx_products_woocommerce_connection_id ON public.products(woocommerce_connection_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_woocommerce_id ON public.product_variants(woocommerce_id);
CREATE INDEX IF NOT EXISTS idx_sync_schedules_next_sync ON public.woocommerce_sync_schedules(next_sync_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sync_logs_connection_started ON public.woocommerce_sync_logs(connection_id, started_at);