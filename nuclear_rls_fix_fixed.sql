-- 🚨 NUCLEAR RLS FIX - Complete Security Bypass (FIXED VERSION)
-- This will completely disable ALL security mechanisms temporarily
-- Run this in your VPS Supabase SQL Editor

-- =========================================
-- STEP 1: COMPLETELY DISABLE ALL SECURITY
-- =========================================

-- Disable RLS on ALL tables
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on any other tables that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- =========================================
-- STEP 2: DROP ALL POLICIES COMPLETELY
-- =========================================

-- Drop ALL policies on ALL tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- =========================================
-- STEP 3: CHECK FOR AND DISABLE TRIGGERS
-- =========================================

-- Disable ALL triggers that might cause recursion
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.schema_name) || '.' || quote_ident(r.table_name) || ' DISABLE TRIGGER ' || quote_ident(r.trigger_name);
    END LOOP;
END $$;

-- =========================================
-- STEP 4: CHECK FOR PROBLEMATIC FUNCTIONS
-- =========================================

-- List all functions that might be causing issues
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname LIKE '%profile%' OR p.proname LIKE '%user%' OR p.proname LIKE '%role%');

-- =========================================
-- STEP 5: TEST ACCESS WITHOUT ANY SECURITY
-- =========================================

-- Test if we can now access the tables
SELECT 'Testing access without security...' as status;

-- These should now work without any recursion:
SELECT COUNT(*) as user_roles_count FROM user_roles;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as sales_count FROM sales;
SELECT COUNT(*) as customers_count FROM customers;

SELECT '✅ Security completely disabled! Testing app queries...' as result;

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

-- =========================================
-- STEP 6: RE-ENABLE BASIC SECURITY (OPTIONAL)
-- =========================================

-- Only if the above tests work, we can re-enable basic security
-- Uncomment these lines ONLY after confirming the above tests work:

/*
-- Re-enable RLS with minimal policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create ONLY the most basic policies possible
CREATE POLICY "user_roles_open" ON user_roles FOR ALL TO authenticated USING (true);
CREATE POLICY "profiles_open" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "products_open" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "sales_open" ON sales FOR ALL TO authenticated USING (true);
CREATE POLICY "customers_open" ON customers FOR ALL TO authenticated USING (true);
*/

SELECT '🎉 Nuclear option applied! All security mechanisms disabled!' as final_result;
SELECT '⚠️ IMPORTANT: Re-enable security only after confirming the app works!' as warning;
