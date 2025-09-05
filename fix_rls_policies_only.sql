-- 🚀 Fix Only the RLS Policy Issues (Most Critical)
-- Run this in your VPS Supabase SQL Editor

-- =========================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- =========================================

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON user_roles; 
DROP POLICY IF EXISTS "Enable read access for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON user_roles;

-- Drop problematic policies on profiles that reference user_roles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- Create SIMPLE, NON-RECURSIVE policies for user_roles
CREATE POLICY "user_roles_authenticated_read" 
ON user_roles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "user_roles_service_all" 
ON user_roles FOR ALL 
TO service_role 
USING (true);

-- Create SIMPLE, NON-RECURSIVE policies for profiles
CREATE POLICY "profiles_own_data" 
ON profiles FOR ALL 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "profiles_service_all" 
ON profiles FOR ALL 
TO service_role 
USING (true);

-- Ensure other tables have basic policies without recursion
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "products_authenticated_read" ON products;
DROP POLICY IF EXISTS "sales_authenticated_read" ON sales;
DROP POLICY IF EXISTS "customers_authenticated_read" ON customers;

-- Create new policies
CREATE POLICY "products_authenticated_read" 
ON products FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "sales_authenticated_read" 
ON sales FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "customers_authenticated_read" 
ON customers FOR SELECT 
TO authenticated 
USING (true);

-- Add missing email column to customers (for future use)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Test the fixes
SELECT 'RLS policies fixed! Testing...' as status;

-- These should now work without infinite recursion:
SELECT COUNT(*) as user_roles_count FROM user_roles;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as sales_count FROM sales;
SELECT COUNT(*) as customers_count FROM customers;

SELECT '✅ All RLS policy issues resolved!' as result;
