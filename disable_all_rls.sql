-- DISABLE ALL RLS POLICIES FOR THE ENTIRE APP
-- Run this in Supabase SQL Editor: https://supabase.rahedeen.com/project/default/sql/new
-- WARNING: This will disable all Row Level Security - use with caution in production

-- 1. Disable RLS on all main tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_webhook_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_code_settings DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing RLS policies (cleanup)
-- Profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- User roles table
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- Products table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.products;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.products;

-- Product variants table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_variants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.product_variants;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.product_variants;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.product_variants;

-- Sales table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sales;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.sales;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.sales;

-- Sale items table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sale_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.sale_items;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.sale_items;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.sale_items;

-- Customers table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.customers;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.customers;

-- Inventory adjustments table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.inventory_adjustments;

-- Business settings table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.business_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.business_settings;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.business_settings;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.business_settings;

-- System settings table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.system_settings;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.system_settings;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.system_settings;

-- User preferences table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_preferences;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_preferences;

-- Courier webhook settings table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.courier_webhook_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.courier_webhook_settings;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.courier_webhook_settings;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.courier_webhook_settings;

-- WooCommerce connections table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.woocommerce_connections;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.woocommerce_connections;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.woocommerce_connections;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.woocommerce_connections;

-- WooCommerce sync logs table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.woocommerce_sync_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.woocommerce_sync_logs;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.woocommerce_sync_logs;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.woocommerce_sync_logs;

-- Custom code settings table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.custom_code_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.custom_code_settings;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.custom_code_settings;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.custom_code_settings;

-- 3. Create simple user management functions (no RLS needed)
DROP FUNCTION IF EXISTS public.get_all_users_with_roles();

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

GRANT EXECUTE ON FUNCTION public.get_all_users_with_roles() TO authenticated;

-- 4. Create update_user_role function
DROP FUNCTION IF EXISTS public.update_user_role(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, new_role::user_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = new_role::user_role,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;

-- 5. Create delete_user_account function
DROP FUNCTION IF EXISTS public.delete_user_account(UUID);

CREATE OR REPLACE FUNCTION public.delete_user_account(
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;

-- 6. Create user profile function
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  full_name TEXT,
  phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (user_id, full_name, phone)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = now();
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- 7. Test the functions
SELECT 'RLS DISABLED - Testing functions...' as status;
SELECT * FROM public.get_all_users_with_roles();

-- 8. Show which tables have RLS disabled
SELECT 'Tables with RLS disabled:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
ORDER BY tablename;
