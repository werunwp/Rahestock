-- Fix security vulnerability: Restrict courier webhook settings access to admins and managers only
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can create courier webhook settings" ON public.courier_webhook_settings;
DROP POLICY IF EXISTS "Users can delete courier webhook settings" ON public.courier_webhook_settings;
DROP POLICY IF EXISTS "Users can update courier webhook settings" ON public.courier_webhook_settings;
DROP POLICY IF EXISTS "Users can view courier webhook settings" ON public.courier_webhook_settings;

-- Create secure policies that only allow admins and managers access
CREATE POLICY "Only admins and managers can view webhook settings"
ON public.courier_webhook_settings
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

CREATE POLICY "Only admins and managers can create webhook settings"
ON public.courier_webhook_settings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

CREATE POLICY "Only admins and managers can update webhook settings"
ON public.courier_webhook_settings
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

CREATE POLICY "Only admins and managers can delete webhook settings"
ON public.courier_webhook_settings
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);