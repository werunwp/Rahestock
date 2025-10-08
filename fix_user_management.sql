-- Fix User Management by creating the missing RPC function
-- Run this in Supabase SQL Editor: https://supabase.rahedeen.com/project/default/sql/new

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_all_users_with_roles();

-- Create RPC function to get all users with their roles
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    u.id,
    u.email,
    COALESCE(p.full_name, 'N/A') as full_name,
    p.phone,
    COALESCE(ur.role::TEXT, 'staff') as role,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.user_id
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  ORDER BY u.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_with_roles() TO authenticated;

-- Drop and recreate update_user_role function
DROP FUNCTION IF EXISTS public.update_user_role(UUID, TEXT);

-- Create RPC function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Update or insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role::user_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = new_role::user_role,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;

-- Drop and recreate delete_user_account function
DROP FUNCTION IF EXISTS public.delete_user_account(UUID);

-- Create RPC function to delete user
CREATE OR REPLACE FUNCTION public.delete_user_account(
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Delete user role first
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Delete profile
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Note: Actual user deletion from auth.users should be done via Edge Function
  -- with service role privileges
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- Test the function
SELECT * FROM public.get_all_users_with_roles();
