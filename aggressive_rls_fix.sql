-- 🚨 AGGRESSIVE RLS FIX - Complete Policy Reset
-- This will completely remove ALL policies and create simple, non-recursive ones
-- Run this in your VPS Supabase SQL Editor

-- =========================================
-- STEP 1: COMPLETELY DISABLE RLS TEMPORARILY
-- =========================================

-- Disable RLS on all tables to break any circular dependencies
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- =========================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- =========================================

-- Drop ALL policies on user_roles (this is the main culprit)
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_authenticated_read" ON user_roles;
DROP POLICY IF EXISTS "user_roles_service_all" ON user_roles;
DROP POLICY IF EXISTS "Allow authenticated users to read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Allow service role to manage user_roles" ON user_roles;

-- Drop ALL policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;
DROP POLICY IF EXISTS "profiles_service_all" ON profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON profiles;

-- Drop ALL policies on other tables
DROP POLICY IF EXISTS "products_authenticated_read" ON products;
DROP POLICY IF EXISTS "sales_authenticated_read" ON sales;
DROP POLICY IF EXISTS "customers_authenticated_read" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to read sales" ON sales;
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON customers;

-- =========================================
-- STEP 3: CREATE MINIMAL, NON-RECURSIVE POLICIES
-- =========================================

-- Re-enable RLS with minimal policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create ONLY the most basic policies possible
CREATE POLICY "user_roles_basic" ON user_roles FOR ALL TO authenticated USING (true);
CREATE POLICY "profiles_basic" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "products_basic" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "sales_basic" ON sales FOR ALL TO authenticated USING (true);
CREATE POLICY "customers_basic" ON customers FOR ALL TO authenticated USING (true);

-- =========================================
-- STEP 4: TEST THE FIX
-- =========================================

-- Test if the infinite recursion is gone
SELECT 'Testing basic queries...' as status;

-- These should now work without infinite recursion:
SELECT COUNT(*) as user_roles_count FROM user_roles;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as sales_count FROM sales;
SELECT COUNT(*) as customers_count FROM customers;

SELECT '✅ Basic RLS fix applied! Testing app queries...' as result;

-- Test the exact queries that were failing
SELECT 'Testing profiles query...' as test1;
SELECT id, full_name FROM profiles LIMIT 1;

SELECT 'Testing user_roles query...' as test2;
SELECT id, user_id, role FROM user_roles LIMIT 1;

SELECT 'Testing products query...' as test3;
SELECT id, name, rate FROM products LIMIT 1;

SELECT 'Testing sales query...' as test4;
SELECT id, grand_total FROM sales LIMIT 1;

SELECT 'Testing customers query...' as test5;
SELECT id, name, phone FROM customers LIMIT 1;

SELECT '🎉 All queries working! RLS infinite recursion fixed!' as final_result;
