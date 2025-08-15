-- Create pathao_settings table for storing Pathao Courier API credentials and settings
CREATE TABLE public.pathao_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_base_url TEXT NOT NULL DEFAULT 'https://api-hermes.pathao.com',
  access_token TEXT NOT NULL,
  store_id INTEGER NOT NULL,
  default_delivery_type INTEGER NOT NULL DEFAULT 48,
  default_item_type INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pathao_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for pathao_settings (only admins can manage these settings)
CREATE POLICY "Only admins can manage pathao settings"
ON public.pathao_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_pathao_settings_updated_at
BEFORE UPDATE ON public.pathao_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();