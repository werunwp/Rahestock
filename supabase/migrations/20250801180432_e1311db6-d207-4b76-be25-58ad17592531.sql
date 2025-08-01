-- Create system_settings table
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_symbol TEXT NOT NULL DEFAULT '৳',
  currency_code TEXT NOT NULL DEFAULT 'BDT',
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  date_format TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  time_format TEXT NOT NULL DEFAULT '12h',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for system settings (authenticated users can manage)
CREATE POLICY "Authenticated users can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system settings
INSERT INTO public.system_settings (currency_symbol, currency_code, timezone, date_format, time_format)
VALUES ('৳', 'BDT', 'Asia/Dhaka', 'dd/MM/yyyy', '12h');