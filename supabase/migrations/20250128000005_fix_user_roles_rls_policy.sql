-- Fix user_roles RLS policy to allow users to insert their own role
-- This is needed for first-time setup when users don't have admin privileges yet

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create a new policy that allows users to insert their own role
CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create a policy that allows users to view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create a policy that allows admins to manage all user roles (except their own)
CREATE POLICY "Admins can manage other user roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid());

-- Allow admins to update their own role (but not delete it)
CREATE POLICY "Admins can update their own role" 
ON public.user_roles 
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid());
