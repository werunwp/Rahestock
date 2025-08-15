-- Create table for custom CSS and code settings
CREATE TABLE public.custom_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type TEXT NOT NULL CHECK (setting_type IN ('custom_css', 'head_snippet', 'body_snippet')),
  content TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setting_type)
);

-- Enable RLS
ALTER TABLE public.custom_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage custom settings
CREATE POLICY "Only admins can manage custom settings"
  ON public.custom_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updating timestamp
CREATE TRIGGER update_custom_settings_updated_at
  BEFORE UPDATE ON public.custom_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();