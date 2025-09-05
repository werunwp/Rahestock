-- Complete Profile Fix Script
-- Run this in your Supabase SQL Editor to completely resolve all profile issues

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as info;

SELECT 'Profiles table exists:' as check_item;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
) as profiles_table_exists;

SELECT 'Current profiles count:' as check_item;
SELECT COUNT(*) as profiles_count FROM public.profiles;

SELECT 'Profiles with null names:' as check_item;
SELECT COUNT(*) as null_names_count 
FROM public.profiles 
WHERE full_name IS NULL OR full_name = '';

-- Step 2: Backup existing data (if any)
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM public.profiles;

-- Step 3: Drop and recreate profiles table completely
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 4: Create new profiles table with proper structure
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text NOT NULL DEFAULT 'Unknown User',
    role text DEFAULT 'user',
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 5: Disable RLS temporarily for data insertion
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Step 6: Insert profiles with guaranteed non-null names
INSERT INTO public.profiles (id, email, full_name, role, phone, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    -- This CASE statement guarantees a non-null full_name
    CASE 
        -- Try to get name from metadata first
        WHEN u.raw_user_meta_data IS NOT NULL 
             AND u.raw_user_meta_data != '{}' 
             AND u.raw_user_meta_data != 'null'
             AND u.raw_user_meta_data->>'full_name' IS NOT NULL 
             AND u.raw_user_meta_data->>'full_name' != '' 
             AND u.raw_user_meta_data->>'full_name' != 'null'
        THEN u.raw_user_meta_data->>'full_name'
        
        -- Try alternative name field
        WHEN u.raw_user_meta_data IS NOT NULL 
             AND u.raw_user_meta_data != '{}' 
             AND u.raw_user_meta_data != 'null'
             AND u.raw_user_meta_data->>'name' IS NOT NULL 
             AND u.raw_user_meta_data->>'name' != '' 
             AND u.raw_user_meta_data->>'name' != 'null'
        THEN u.raw_user_meta_data->>'name'
        
        -- Use email username (part before @)
        WHEN u.email IS NOT NULL AND u.email != ''
        THEN INITCAP(SPLIT_PART(u.email, '@', 1))
        
        -- Final fallback: User + ID
        ELSE 'User_' || SUBSTRING(u.id::text, 1, 8)
    END as full_name,
    
    'user' as role,
    
    -- Handle phone
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
WHERE u.id IS NOT NULL;

-- Step 7: Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
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

-- Step 9: Verify the fix
SELECT '=== VERIFICATION ===' as info;

SELECT 'Profiles created successfully:' as check_item;
SELECT COUNT(*) as total_profiles FROM public.profiles;

SELECT 'Profiles with null names (should be 0):' as check_item;
SELECT COUNT(*) as null_names_count 
FROM public.profiles 
WHERE full_name IS NULL OR full_name = '';

SELECT 'Sample profiles:' as check_item;
SELECT id, email, full_name, role, created_at
FROM public.profiles 
ORDER BY created_at 
LIMIT 5;

-- Step 10: Create user_roles table and admin role
SELECT '=== SETTING UP ADMIN ROLE ===' as info;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create admin role for your user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM public.profiles 
WHERE email = 'asifkhannirob1@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create RLS policies
CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

SELECT 'Admin roles created:' as check_item;
SELECT COUNT(*) as admin_count FROM public.user_roles WHERE role = 'admin';

SELECT 'Setup complete! Your app should now work.' as status;

