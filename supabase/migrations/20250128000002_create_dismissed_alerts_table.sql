-- Create dismissed_alerts table to track user-dismissed alerts
CREATE TABLE IF NOT EXISTS public.dismissed_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, alert_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for dismissed_alerts
CREATE POLICY "Users can view their own dismissed alerts" ON public.dismissed_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dismissed alerts" ON public.dismissed_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dismissed alerts" ON public.dismissed_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_user_id ON public.dismissed_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_alert_id ON public.dismissed_alerts(alert_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_alerts_dismissed_at ON public.dismissed_alerts(dismissed_at);
