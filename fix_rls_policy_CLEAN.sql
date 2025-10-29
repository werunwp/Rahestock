-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create policy for users to insert their own role
CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create policy for users to view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Create policy for admins to manage other user roles
CREATE POLICY "Admins can manage other user roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id <> auth.uid());

-- Allow admins to update their own role
CREATE POLICY "Admins can update their own role" 
ON public.user_roles 
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role) AND user_id = auth.uid());

