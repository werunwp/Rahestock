-- Ensure custom_settings table exists with correct structure
-- This script can be run in Supabase SQL editor to verify/fix the table

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_settings') THEN
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
        
        RAISE NOTICE 'custom_settings table created successfully';
    ELSE
        RAISE NOTICE 'custom_settings table already exists';
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.custom_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Only admins can manage custom settings" ON public.custom_settings;

-- Create policies - only admins can manage custom settings
CREATE POLICY "Only admins can manage custom settings"
  ON public.custom_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updating timestamp if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_settings_updated_at') THEN
        CREATE TRIGGER update_custom_settings_updated_at
          BEFORE UPDATE ON public.custom_settings
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column();
        
        RAISE NOTICE 'update_custom_settings_updated_at trigger created successfully';
    ELSE
        RAISE NOTICE 'update_custom_settings_updated_at trigger already exists';
    END IF;
END $$;

-- Insert default records if they don't exist
INSERT INTO public.custom_settings (setting_type, content, is_enabled)
VALUES 
  ('custom_css', '/* Your custom CSS here */\n.my-custom-class {\n  color: #ff0000;\n}', false),
  ('head_snippet', '<!-- Head snippet for analytics, meta tags, etc. -->', false),
  ('body_snippet', '<!-- Body snippet for chat widgets, tracking, etc. -->', false)
ON CONFLICT (setting_type) DO NOTHING;

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'custom_settings' 
ORDER BY ordinal_position;

-- Show current data
SELECT * FROM public.custom_settings ORDER BY setting_type;
