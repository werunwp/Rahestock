-- Create table for dismissed alerts
CREATE TABLE public.dismissed_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id TEXT NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own dismissed alerts" 
ON public.dismissed_alerts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own dismissed alerts" 
ON public.dismissed_alerts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own dismissed alerts" 
ON public.dismissed_alerts 
FOR DELETE 
USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX idx_dismissed_alerts_user_id ON public.dismissed_alerts(user_id);
CREATE INDEX idx_dismissed_alerts_alert_id ON public.dismissed_alerts(user_id, alert_id);