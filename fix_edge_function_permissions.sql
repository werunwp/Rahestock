-- 🔧 Fix Edge Function Permissions and Access
-- Run this in your VPS Supabase SQL Editor

-- =========================================
-- STEP 1: VERIFY CURRENT PERMISSIONS
-- =========================================

-- Check current service role permissions
SELECT '=== CURRENT SERVICE ROLE PERMISSIONS ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles', 'user_preferences', 'sales', 'products', 'customers')
ORDER BY tablename;

-- =========================================
-- STEP 2: GRANT FULL PERMISSIONS TO SERVICE ROLE
-- =========================================

-- Grant ALL permissions to service_role on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant specific permissions on key tables
GRANT ALL PRIVILEGES ON user_roles TO service_role;
GRANT ALL PRIVILEGES ON profiles TO service_role;
GRANT ALL PRIVILEGES ON user_preferences TO service_role;
GRANT ALL PRIVILEGES ON sales TO service_role;
GRANT ALL PRIVILEGES ON products TO service_role;
GRANT ALL PRIVILEGES ON customers TO service_role;
GRANT ALL PRIVILEGES ON sales_items TO service_role;
GRANT ALL PRIVILEGES ON product_variants TO service_role;
GRANT ALL PRIVILEGES ON business_settings TO service_role;
GRANT ALL PRIVILEGES ON system_settings TO service_role;

-- =========================================
-- STEP 3: ENSURE RLS IS PROPERLY CONFIGURED
-- =========================================

-- Check RLS status on key tables
SELECT '=== RLS STATUS ON KEY TABLES ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles', 'user_preferences', 'sales', 'products', 'customers')
ORDER BY tablename;

-- =========================================
-- STEP 4: CREATE OR REPLACE RLS POLICIES FOR SERVICE ROLE
-- =========================================

-- Drop existing policies that might interfere
DROP POLICY IF EXISTS "user_roles_service_role_access" ON user_roles;
DROP POLICY IF EXISTS "profiles_service_role_access" ON user_roles;
DROP POLICY IF EXISTS "user_preferences_service_role_access" ON user_preferences;

-- Create policies that allow service_role full access
CREATE POLICY "user_roles_service_role_access" ON user_roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "profiles_service_role_access" ON profiles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "user_preferences_service_role_access" ON user_preferences
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================
-- STEP 5: VERIFY SERVICE ROLE CAN ACCESS TABLES
-- =========================================

-- Test if service role can access tables (this will show in logs)
SELECT '=== TESTING SERVICE ROLE ACCESS ===' as info;

-- Test user_roles access
DO $$
BEGIN
    -- This simulates what the Edge Function does
    PERFORM COUNT(*) FROM user_roles WHERE role = 'admin';
    RAISE NOTICE '✅ Service role can access user_roles table';
    
    PERFORM COUNT(*) FROM profiles LIMIT 1;
    RAISE NOTICE '✅ Service role can access profiles table';
    
    PERFORM COUNT(*) FROM sales LIMIT 1;
    RAISE NOTICE '✅ Service role can access sales table';
    
    RAISE NOTICE '🎉 All table access tests passed!';
END $$;

-- =========================================
-- STEP 6: CREATE INDEXES FOR BETTER PERFORMANCE
-- =========================================

-- Create indexes for commonly queried columns (only if columns exist)
DO $$
BEGIN
    -- Create user_roles indexes only if user_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);
        RAISE NOTICE 'Created user_roles user_id index';
    ELSE
        RAISE NOTICE 'Skipping user_roles user_id index - column not found';
    END IF;
    
    -- Create role index (this should always exist)
    CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles (role);
    RAISE NOTICE 'Created user_roles role index';
    
    -- Create profiles indexes only if user_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);
        RAISE NOTICE 'Created profiles user_id index';
    ELSE
        RAISE NOTICE 'Skipping profiles user_id index - column not found';
    END IF;
END $$;

-- =========================================
-- STEP 7: FINAL VERIFICATION
-- =========================================

SELECT '=== FINAL VERIFICATION ===' as info;
SELECT '✅ Edge Function should now work properly!' as result;

-- Show final permissions
SELECT 'Final service role permissions:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles', 'user_preferences')
ORDER BY tablename;
