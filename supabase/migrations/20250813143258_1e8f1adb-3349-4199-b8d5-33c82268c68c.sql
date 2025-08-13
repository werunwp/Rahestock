-- Allow users to view their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Update the existing admin policy to not conflict with the new one
DROP POLICY "Admins can manage user roles" ON public.user_roles;

-- Recreate admin policy for insert, update, delete only
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role) AND (user_id <> auth.uid()));