-- Fix Duplicate Profiles Issue - Robust Version
-- Run this in your Supabase SQL Editor

-- First, let's see what's in the profiles table
SELECT 'Current profiles table content:' as info;
SELECT * FROM public.profiles ORDER BY id;

-- Check for duplicate user IDs
SELECT 'Duplicate user IDs found:' as info;
SELECT id, COUNT(*) as duplicate_count
FROM public.profiles 
GROUP BY id 
HAVING COUNT(*) > 1;

-- Check what data is available in auth.users
SELECT 'Auth users data sample:' as info;
SELECT 
    id, 
    email, 
    raw_user_meta_data,
    created_at
FROM auth.users 
LIMIT 5;

-- Check for users with completely empty metadata
SELECT 'Users with empty metadata:' as info;
SELECT 
    id, 
    email,
    CASE 
        WHEN raw_user_meta_data IS NULL THEN 'NULL metadata'
        WHEN raw_user_meta_data = '{}' THEN 'Empty object'
        WHEN raw_user_meta_data = 'null' THEN 'String null'
        ELSE 'Has data'
    END as metadata_status
FROM auth.users;

-- Fix: Drop and recreate the profiles table with proper constraints
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate profiles table with correct structure
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text NOT NULL,
    role text DEFAULT 'user',
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Temporarily disable RLS to allow data insertion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Now recreate profiles from auth.users with guaranteed non-null names
INSERT INTO public.profiles (id, email, full_name, role, phone, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    -- Guaranteed non-null full_name with multiple fallbacks
    CASE 
        -- First try: full_name from metadata
        WHEN u.raw_user_meta_data IS NOT NULL 
             AND u.raw_user_meta_data != '{}' 
             AND u.raw_user_meta_data != 'null'
             AND u.raw_user_meta_data->>'full_name' IS NOT NULL 
             AND u.raw_user_meta_data->>'full_name' != '' 
             AND u.raw_user_meta_data->>'full_name' != 'null'
        THEN u.raw_user_meta_data->>'full_name'
        
        -- Second try: name from metadata
        WHEN u.raw_user_meta_data IS NOT NULL 
             AND u.raw_user_meta_data != '{}' 
             AND u.raw_user_meta_data != 'null'
             AND u.raw_user_meta_data->>'name' IS NOT NULL 
             AND u.raw_user_meta_data->>'name' != '' 
             AND u.raw_user_meta_data->>'name' != 'null'
        THEN u.raw_user_meta_data->>'name'
        
        -- Third try: email username (part before @)
        WHEN u.email IS NOT NULL AND u.email != ''
        THEN SPLIT_PART(u.email, '@', 1)
        
        -- Fourth try: first name from email if it contains dots
        WHEN u.email IS NOT NULL AND u.email != '' AND u.email LIKE '%.%'
        THEN INITCAP(SPLIT_PART(SPLIT_PART(u.email, '@', 1), '.', 1))
        
        -- Fifth try: capitalize email username
        WHEN u.email IS NOT NULL AND u.email != ''
        THEN INITCAP(SPLIT_PART(u.email, '@', 1))
        
        -- Final fallback: User + first 8 chars of ID
        ELSE 'User ' || SUBSTRING(u.id::text, 1, 8)
    END as full_name,
    
    'user' as role,
    
    -- Handle phone with fallbacks
    CASE 
        WHEN u.raw_user_meta_data IS NOT NULL 
             AND u.raw_user_meta_data != '{}' 
             AND u.raw_user_meta_data != 'null'
        THEN COALESCE(
            u.raw_user_meta_data->>'phone',
            u.raw_user_meta_data->>'phone_number',
            u.raw_user_meta_data->>'mobile'
        )
        ELSE NULL
    END as phone,
    
    u.created_at,
    COALESCE(u.updated_at, u.created_at) as updated_at
FROM auth.users u
WHERE u.id IS NOT NULL  -- Ensure we have a valid ID
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Check the result
SELECT 'Profiles after fix:' as info;
SELECT * FROM public.profiles ORDER BY created_at;

-- Verify no null names
SELECT 'Profiles with null names (should be 0):' as info;
SELECT COUNT(*) as null_name_count
FROM public.profiles 
WHERE full_name IS NULL OR full_name = '';

-- Show sample of generated names
SELECT 'Sample of generated names:' as info;
SELECT id, email, full_name, created_at
FROM public.profiles 
ORDER BY created_at 
LIMIT 10;
