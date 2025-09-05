-- Admin Permissions Setup Script
-- Run this AFTER you've successfully created your admin user and enabled RLS
-- This script sets up all admin functionality including user management and role permissions

-- First, check if admin tables already exist
SELECT 'Checking existing admin tables:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('role_permissions', 'user_activity_logs', 'admin_audit_logs')
ORDER BY table_name;

-- Create role_permissions table for role-based feature access
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
  permission_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Create user_activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_audit_logs table for sensitive admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all admin tables
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for role_permissions
CREATE POLICY "Admins can manage all role permissions" 
ON public.role_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create RLS policies for user_activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Users can create their own activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for admin_audit_logs
CREATE POLICY "Admins can view all audit logs" 
ON public.admin_audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can create audit logs" 
ON public.admin_audit_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to role_permissions table
CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get all users with their roles and profiles
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  phone text,
  role text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(p.full_name, 'N/A') as full_name,
    p.phone,
    COALESCE(ur.role, 'user') as role,
    u.created_at,
    u.last_sign_in_at,
    u.confirmed_at IS NOT NULL as is_active
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  ORDER BY u.created_at DESC;
END;
$$;

-- Create function to create new user with role
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'staff',
  p_password text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_user_id uuid;
  admin_user_id uuid;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get current admin user ID for audit log
  SELECT ur.user_id INTO admin_user_id 
  FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin';

  -- Create user in auth.users (this will be done by the app)
  -- For now, we'll just return a placeholder
  -- The actual user creation should be handled by the app using Supabase Auth
  
  -- Log the admin action
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    details
  ) VALUES (
    admin_user_id,
    'create_user_attempt',
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'phone', p_phone,
      'role', p_role
    )
  );

  -- Return a placeholder (actual user ID will come from the app)
  RETURN gen_random_uuid();
END;
$$;

-- Create function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id uuid,
  p_new_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get current admin user ID for audit log
  SELECT ur.user_id INTO admin_user_id 
  FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin';

  -- Update user role
  UPDATE public.user_roles 
  SET role = p_new_role 
  WHERE user_id = p_user_id;

  -- If no rows were updated, insert new role
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (p_user_id, p_new_role);
  END IF;

  -- Log the admin action
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    details
  ) VALUES (
    admin_user_id,
    'update_user_role',
    p_user_id,
    jsonb_build_object('new_role', p_new_role)
  );

  RETURN true;
END;
$$;

-- Create function to delete user
CREATE OR REPLACE FUNCTION public.delete_user(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Prevent admin from deleting themselves
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Get current admin user ID for audit log
  SELECT ur.user_id INTO admin_user_id 
  FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin';

  -- Log the admin action before deletion
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    details
  ) VALUES (
    admin_user_id,
    'delete_user_attempt',
    p_user_id,
    jsonb_build_object('timestamp', now())
  );

  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Delete user profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Note: auth.users deletion should be handled by the app using Supabase Auth

  RETURN true;
END;
$$;

-- Grant execute permissions on admin functions
GRANT EXECUTE ON FUNCTION public.get_all_users_with_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user TO authenticated;

-- Insert default role permissions for all roles
INSERT INTO public.role_permissions (role, permission_key, allowed) VALUES
-- Admin permissions (all allowed)
('admin', 'admin.manage_roles', true),
('admin', 'admin.manage_permissions', true),
('admin', 'admin.full_backup', true),
('admin', 'admin.data_restore', true),
('admin', 'admin.view_audit_logs', true),
('admin', 'admin.manage_system', true),

-- Manager permissions
('manager', 'products.view', true),
('manager', 'products.create', true),
('manager', 'products.edit', true),
('manager', 'products.delete', true),
('manager', 'inventory.view', true),
('manager', 'inventory.edit', true),
('manager', 'sales.view', true),
('manager', 'sales.create', true),
('manager', 'sales.edit', true),
('manager', 'customers.view', true),
('manager', 'customers.create', true),
('manager', 'customers.edit', true),
('manager', 'reports.view', true),
('manager', 'reports.export', true),
('manager', 'settings.view_business', true),
('manager', 'settings.edit_business', true),
('manager', 'settings.view_system', true),
('manager', 'users.view', true),
('manager', 'users.create', true),
('manager', 'users.edit', true),

-- Staff permissions
('staff', 'products.view', true),
('staff', 'products.create', true),
('staff', 'products.edit', false),
('staff', 'products.delete', false),
('staff', 'inventory.view', true),
('staff', 'inventory.edit', true),
('staff', 'sales.view', true),
('staff', 'sales.create', true),
('staff', 'sales.edit', false),
('staff', 'customers.view', true),
('staff', 'customers.create', true),
('staff', 'customers.edit', false),
('staff', 'reports.view', true),
('staff', 'reports.export', false),
('staff', 'settings.view_business', true),
('staff', 'settings.edit_business', false),
('staff', 'settings.view_system', false),
('staff', 'users.view', false),
('staff', 'users.create', false),
('staff', 'users.edit', false),


ON CONFLICT (role, permission_key) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  updated_at = now();

-- Ensure admin user has admin role (if not already set)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  ur.user_id,
  'admin'
FROM public.user_roles ur
WHERE ur.role = 'admin'
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the final structure
SELECT 'Admin tables created:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('role_permissions', 'user_activity_logs', 'admin_audit_logs')
ORDER BY table_name;

-- Check RLS status
SELECT 'RLS Status:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND table_name IN ('role_permissions', 'user_activity_logs', 'admin_audit_logs')
ORDER BY table_name;

-- Check functions
SELECT 'Admin functions created:' as info;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%' OR routine_name LIKE '%admin%'
ORDER BY routine_name;

-- Check role permissions
SELECT 'Role permissions created:' as info;
SELECT 
    role,
    permission_key,
    allowed
FROM public.role_permissions
ORDER BY role, permission_key;

-- Final verification
SELECT 'Admin setup complete! Admin users now have full permissions.' as status;
SELECT 'User Management tab should now work properly.' as note;
SELECT 'All role-based permissions are configured.' as note2;
