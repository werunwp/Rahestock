-- RLS Policy Fix for user_roles table
-- This fixes the "new row violates row-level security policy" error

-- First, let's check if the has_role function exists and works
SELECT public.has_role(auth.uid(), 'admin'::public.user_role) as is_admin;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage other user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Create new policies that allow proper access

-- 1. Allow users to insert their own role (needed for first-time setup)
CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 2. Allow users to view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 3. Allow admins to manage other user roles (but not their own for DELETE)
CREATE POLICY "Admins can manage other user roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid());

-- 4. Allow admins to update their own role (but not delete it)
CREATE POLICY "Admins can update their own role" 
ON public.user_roles 
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid());

-- 5. Allow admins to delete other user roles (but not their own)
CREATE POLICY "Admins can delete other user roles" 
ON public.user_roles 
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid());

-- Test the policies by checking if we can insert a test role
-- (This will only work if the user is authenticated)
DO $$
BEGIN
    -- Try to insert a test role for the current user
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (auth.uid(), 'staff'::public.user_role)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'RLS policies are working correctly!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing RLS policies: %', SQLERRM;
END $$;

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_roles' 
ORDER BY policyname;
