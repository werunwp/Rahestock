-- Complete First-Time Setup Script
-- Run this in your Supabase SQL Editor to set up all necessary tables

-- First, let's see what tables currently exist
SELECT 'Current tables:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Drop existing tables to start fresh (if needed)
-- Uncomment the following lines if you want to start completely fresh
-- DROP TABLE IF EXISTS public.user_roles CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.system_settings CASCADE;

-- Create profiles table with the correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text NOT NULL,
    role text DEFAULT 'user',
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Initial setup profile creation" ON public.profiles;

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Initial setup role creation" ON public.user_roles;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

-- Create RLS policies for profiles
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (for normal operation)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow initial profile creation during setup (when no admin exists yet)
CREATE POLICY "Initial setup profile creation" ON public.profiles
    FOR INSERT WITH CHECK (
        -- Allow if this is the first profile being created
        (SELECT COUNT(*) FROM public.profiles) = 0
        OR
        -- Or if user is creating their own profile
        auth.uid() = id
    );

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for user_roles
-- Allow users to insert their own roles
CREATE POLICY "Users can insert own roles" ON public.user_roles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Allow initial role creation during setup (when no admin exists yet)
CREATE POLICY "Initial setup role creation" ON public.user_roles
    FOR INSERT WITH CHECK (
        -- Allow if this is the first role being created
        (SELECT COUNT(*) FROM public.user_roles) = 0
        OR
        -- Or if user is creating their own role
        auth.uid() = user_id
    );

-- Allow admins to manage user roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insert initial system setting to mark app as initialized
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'app_initialized',
    'true',
    'Application has been initialized with first admin user'
) ON CONFLICT (key) DO UPDATE SET 
    value = 'true',
    updated_at = now();

-- Verify the final structure
SELECT 'Final table structures:' as info;

SELECT 'Profiles table:' as table_name;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'User roles table:' as table_name;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'System settings table:' as table_name;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check policies
SELECT 'Policies created:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND table_name IN ('profiles', 'user_roles', 'system_settings')
ORDER BY tablename, policyname;

-- Final verification
SELECT 'Setup complete! You can now create your first admin user.' as status;
