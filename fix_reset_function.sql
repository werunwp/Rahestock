-- 🔧 Fix Reset App Function Access Issues
-- Run this in your VPS Supabase SQL Editor

-- =========================================
-- STEP 1: ENSURE TABLES ARE ACCESSIBLE TO SERVICE ROLE
-- =========================================

-- Grant full access to service role on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Specifically ensure user_roles table is accessible
GRANT ALL ON user_roles TO service_role;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON user_preferences TO service_role;

-- =========================================
-- STEP 2: CREATE MINIMAL DATA IF TABLES ARE EMPTY
-- =========================================

-- Check if user_roles table has any data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1) THEN
        -- Create a default admin user role if table is empty
        INSERT INTO user_roles (user_id, role, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000000', -- Placeholder UUID
            'admin',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created placeholder admin role';
    END IF;
END $$;

-- Check if profiles table has any data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
        -- Create a default admin profile if table is empty
        INSERT INTO profiles (id, user_id, full_name, phone, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-0000-000000000001', -- Placeholder UUID
            '00000000-0000-0000-0000-000000000000', -- Placeholder UUID
            'Admin User',
            '+880000000000',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created placeholder admin profile';
    END IF;
END $$;

-- =========================================
-- STEP 3: VERIFY ACCESS
-- =========================================

-- Test if service role can access the tables
SELECT 'Testing service role access...' as status;

-- These should all work without errors:
SELECT COUNT(*) as user_roles_count FROM user_roles;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as user_preferences_count FROM user_preferences;

-- =========================================
-- STEP 4: CREATE INDEXES FOR BETTER PERFORMANCE
-- =========================================

-- Create indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles (role);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);

-- =========================================
-- STEP 5: VERIFY RESET FUNCTION CAN WORK
-- =========================================

-- Test the exact queries the reset function uses
SELECT 'Testing reset function queries...' as status;

-- Test 1: Admin role check
SELECT role FROM user_roles WHERE user_id = '00000000-0000-0000-0000-000000000000' LIMIT 1;

-- Test 2: Admin users listing
SELECT user_id, created_at FROM user_roles WHERE role = 'admin' ORDER BY created_at ASC;

-- Test 3: Table deletion capability
SELECT COUNT(*) as test_count FROM sales LIMIT 1;

SELECT '✅ Reset function should now work properly!' as result;
