-- Create business settings table for invoice customization
CREATE TABLE public.business_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT 'Your Business Name',
  logo_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  facebook TEXT,
  address TEXT,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_footer_message TEXT DEFAULT 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can manage business settings" 
ON public.business_settings 
FOR ALL 
USING (true);

-- Insert default business settings
INSERT INTO public.business_settings (business_name, phone, email, address)
VALUES ('Your Business Name', '+880123456789', 'business@example.com', 'Business Address, City, Country');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();