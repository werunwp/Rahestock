-- Create WooCommerce connections table
CREATE TABLE public.woocommerce_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  site_name TEXT NOT NULL,
  site_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_import_at TIMESTAMP WITH TIME ZONE,
  total_products_imported INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.woocommerce_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for WooCommerce connections
CREATE POLICY "Users can view their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WooCommerce connections" 
ON public.woocommerce_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_woocommerce_connections_updated_at
BEFORE UPDATE ON public.woocommerce_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create import logs table for tracking import progress
CREATE TABLE public.woocommerce_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.woocommerce_connections(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  total_products INTEGER DEFAULT 0,
  imported_products INTEGER DEFAULT 0,
  failed_products INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for import logs
ALTER TABLE public.woocommerce_import_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for import logs
CREATE POLICY "Users can view their own import logs" 
ON public.woocommerce_import_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.woocommerce_connections 
  WHERE id = connection_id AND user_id = auth.uid()
));

CREATE POLICY "System can manage import logs" 
ON public.woocommerce_import_logs 
FOR ALL
USING (true)
WITH CHECK (true);