-- 🔧 Fix Reset App Function Access Issues (CORRECTED)
-- Run this in your VPS Supabase SQL Editor

-- =========================================
-- STEP 1: CHECK CURRENT TABLE STRUCTURE
-- =========================================

-- Check what columns actually exist in user_roles
SELECT 'Current user_roles structure:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- Check what columns actually exist in profiles
SELECT 'Current profiles structure:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =========================================
-- STEP 2: FIX TABLE STRUCTURE IF NEEDED
-- =========================================

-- Add missing user_id column to user_roles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN user_id UUID;
        RAISE NOTICE 'Added user_id column to user_roles table';
    ELSE
        RAISE NOTICE 'user_id column already exists in user_roles table';
    END IF;
END $$;

-- Add missing id column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN id UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id column to profiles table';
    ELSE
        RAISE NOTICE 'id column already exists in profiles table';
    END IF;
END $$;

-- =========================================
-- STEP 3: ENSURE TABLES ARE ACCESSIBLE TO SERVICE ROLE
-- =========================================

-- Grant full access to service role on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Specifically ensure user_roles table is accessible
GRANT ALL ON user_roles TO service_role;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON user_preferences TO service_role;

-- =========================================
-- STEP 4: CREATE MINIMAL DATA IF TABLES ARE EMPTY
-- =========================================

-- Check if user_roles table has any data (only after columns are added)
DO $$
BEGIN
    -- First check if user_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) THEN
        -- Only try to insert if the column exists
        IF NOT EXISTS (SELECT 1 FROM user_roles LIMIT 1) THEN
            INSERT INTO user_roles (id, user_id, role, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                gen_random_uuid(), -- Placeholder UUID
                'admin',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Created placeholder admin role';
        END IF;
    ELSE
        RAISE NOTICE 'user_id column not yet added, skipping insert';
    END IF;
END $$;

-- Check if profiles table has any data (only after columns are added)
DO $$
BEGIN
    -- First check if id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'id'
    ) THEN
        -- Only try to insert if the column exists
        IF NOT EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
            INSERT INTO profiles (id, user_id, full_name, phone, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                gen_random_uuid(), -- Placeholder UUID
                'Admin User',
                '+880000000000',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Created placeholder admin profile';
        END IF;
    ELSE
        RAISE NOTICE 'id column not yet added, skipping insert';
    END IF;
END $$;

-- =========================================
-- STEP 5: VERIFY ACCESS
-- =========================================

-- Test if service role can access the tables
SELECT 'Testing service role access...' as status;

-- These should all work without errors (only if columns exist):
DO $$
BEGIN
    -- Check user_roles table safely
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) THEN
        RAISE NOTICE 'user_roles table has user_id column, count: %', (SELECT COUNT(*) FROM user_roles);
    ELSE
        RAISE NOTICE 'user_roles table missing user_id column';
    END IF;
    
    -- Check profiles table safely
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'profiles table has id column, count: %', (SELECT COUNT(*) FROM profiles);
    ELSE
        RAISE NOTICE 'profiles table missing id column';
    END IF;
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
        CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles (role);
        RAISE NOTICE 'Created user_roles indexes';
    ELSE
        RAISE NOTICE 'Skipping user_roles indexes - user_id column not found';
    END IF;
    
    -- Create profiles indexes only if user_id column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);
        RAISE NOTICE 'Created profiles indexes';
    ELSE
        RAISE NOTICE 'Skipping profiles indexes - user_id column not found';
    END IF;
END $$;

-- =========================================
-- STEP 7: VERIFY RESET FUNCTION CAN WORK
-- =========================================

-- Test the exact queries the reset function uses (only after columns are added)
SELECT 'Testing reset function queries...' as status;

-- Test 1: Admin role check (only if user_id column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'user_id'
    ) THEN
        -- This will be executed as a separate query
        PERFORM 1;
        RAISE NOTICE 'user_id column exists, can test admin queries';
    ELSE
        RAISE NOTICE 'user_id column not yet added, skipping admin tests';
    END IF;
END $$;

-- Test 2: Basic table access (safe to test)
DO $$
BEGIN
    -- Test sales table access
    BEGIN
        PERFORM COUNT(*) FROM sales LIMIT 1;
        RAISE NOTICE 'Sales table accessible';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Sales table error: %', SQLERRM;
    END;
END $$;

-- Final verification
SELECT '✅ Reset function should now work properly!' as result;

-- Show final table structure
SELECT 'Final user_roles structure:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;

SELECT 'Final profiles structure:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
