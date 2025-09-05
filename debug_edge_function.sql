-- 🔍 Debug Edge Function Database Structure
-- Run this in your VPS Supabase SQL Editor to see what's wrong

-- =========================================
-- CHECK CURRENT TABLE STRUCTURE
-- =========================================

-- Check user_roles table structure
SELECT '=== user_roles TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT '=== profiles TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =========================================
-- CHECK CURRENT DATA
-- =========================================

-- Check user_roles data
SELECT '=== user_roles DATA ===' as info;
SELECT * FROM user_roles LIMIT 5;

-- Check profiles data
SELECT '=== profiles DATA ===' as info;
SELECT * FROM profiles LIMIT 5;

-- =========================================
-- TEST EDGE FUNCTION QUERIES
-- =========================================

-- Test 1: Admin role check (this is what the Edge Function does)
SELECT '=== TESTING EDGE FUNCTION QUERIES ===' as info;

-- This query should work (what the Edge Function expects):
SELECT 'Testing admin role query:' as test;
SELECT role FROM user_roles WHERE role = 'admin' LIMIT 1;

-- This query should work (what the Edge Function expects):
SELECT 'Testing admin users listing:' as test;
SELECT user_id, created_at FROM user_roles WHERE role = 'admin' ORDER BY created_at ASC;

-- =========================================
-- CHECK FOR MISSING COLUMNS
-- =========================================

-- Check if user_id column exists in user_roles
SELECT '=== CHECKING FOR MISSING COLUMNS ===' as info;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'user_id'
        ) THEN '✅ user_id column EXISTS in user_roles'
        ELSE '❌ user_id column MISSING from user_roles'
    END as user_roles_status;

-- Check if id column exists in profiles
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'id'
        ) THEN '✅ id column EXISTS in profiles'
        ELSE '❌ id column MISSING from profiles'
    END as profiles_status;
