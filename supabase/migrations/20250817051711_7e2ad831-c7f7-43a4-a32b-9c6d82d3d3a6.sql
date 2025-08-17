-- Drop the existing pathao_settings table
DROP TABLE IF EXISTS public.pathao_settings;

-- Create new courier_webhook_settings table
CREATE TABLE public.courier_webhook_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url TEXT NOT NULL,
  webhook_name TEXT NOT NULL DEFAULT 'Courier Webhook',
  webhook_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.courier_webhook_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for courier webhook settings
CREATE POLICY "Users can view courier webhook settings" 
ON public.courier_webhook_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create courier webhook settings" 
ON public.courier_webhook_settings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update courier webhook settings" 
ON public.courier_webhook_settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete courier webhook settings" 
ON public.courier_webhook_settings 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_courier_webhook_settings_updated_at
BEFORE UPDATE ON public.courier_webhook_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();