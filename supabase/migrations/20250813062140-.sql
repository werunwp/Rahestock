-- Create role_permissions table for role-based feature access
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.user_role NOT NULL,
  permission_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: allow all authenticated users to read permissions
CREATE POLICY IF NOT EXISTS "Authenticated users can view role permissions"
ON public.role_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can modify permissions
CREATE POLICY IF NOT EXISTS "Only admins can insert role permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY IF NOT EXISTS "Only admins can update role permissions"
ON public.role_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY IF NOT EXISTS "Only admins can delete role permissions"
ON public.role_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::public.user_role));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();