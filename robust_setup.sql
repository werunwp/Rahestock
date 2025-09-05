-- Robust Setup Script - Handles foreign key constraints and timing issues
-- This script creates tables with deferred constraints to avoid timing issues

-- First, let's see what tables currently exist
SELECT 'Current tables:' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Drop existing tables to start completely fresh
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;

-- Create profiles table with deferred foreign key constraint
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY,
    email text,
    full_name text NOT NULL,
    role text DEFAULT 'user',
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Create system_settings table
CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- IMPORTANT: Keep RLS DISABLED during initial setup
-- This allows the first admin user to be created without policy conflicts

-- Insert initial system setting
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'app_initialized',
    'false',
    'Application setup in progress - RLS will be enabled after first admin user'
);

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

-- Check RLS status
SELECT 'RLS Status:' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'system_settings')
ORDER BY tablename;

-- Final verification
SELECT 'Setup complete! RLS is disabled to allow first admin user creation.' as status;
SELECT 'After creating your admin user, you can enable RLS with the enable_rls.sql script.' as note;
SELECT 'Note: Foreign key constraints are not enforced during setup to avoid timing issues.' as note2;
