-- Setup Admin User and Roles for Self-Hosted Supabase
-- Run this in your Supabase SQL Editor

-- First, let's check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Create profiles table if it doesn't exist (it should from the structure clone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Insert admin user into profiles (replace 'your-user-id' with your actual user ID)
-- You can find your user ID from the auth.users table or from the browser console
INSERT INTO public.profiles (id, email, full_name, role) 
VALUES (
    'your-user-id-here', -- Replace this with your actual user ID
    'admin@example.com', -- Replace with your email
    'Admin User',         -- Replace with your name
    'admin'
) ON CONFLICT (id) DO UPDATE SET 
    role = 'admin',
    updated_at = now();

-- Insert admin role into user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES (
    'your-user-id-here', -- Replace this with your actual user ID
    'admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- Create RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Admin users can read all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Admin users can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can manage user roles
CREATE POLICY "Admins can manage user roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Verify the setup
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    ur.role as user_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.role = 'admin';
