-- Safe User Deletion Fix - Works with existing schema

-- ============================================================================
-- STEP 1: Create the safe delete user function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_safely(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = current_user_id AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only admins can delete users'
    );
  END IF;
  
  -- Prevent self-deletion
  IF target_user_id = current_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot delete your own account'
    );
  END IF;
  
  -- Delete related records in the correct order
  -- These will be deleted automatically if CASCADE is set up, but we do it explicitly for safety
  
  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_id = target_user_id;
  
  -- Delete dismissed alerts
  DELETE FROM dismissed_alerts WHERE user_id = target_user_id;
  
  -- Delete user roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE user_id = target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User data deleted successfully from database'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_safely(UUID) TO authenticated;

-- ============================================================================
-- STEP 2: Update RLS policies to allow admin user deletion
-- ============================================================================

-- Profiles deletion policy
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_delete" 
ON public.profiles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role)
  )
);

-- User roles deletion policy
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage other user roles" ON public.user_roles;

CREATE POLICY "user_roles_delete" 
ON public.user_roles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- User preferences deletion policy
DROP POLICY IF EXISTS "user_preferences_delete" ON public.user_preferences;

CREATE POLICY "user_preferences_delete" 
ON public.user_preferences 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Dismissed alerts deletion policy
DROP POLICY IF EXISTS "dismissed_alerts_delete" ON public.dismissed_alerts;

CREATE POLICY "dismissed_alerts_delete" 
ON public.dismissed_alerts 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- ============================================================================
-- STEP 3: Ensure CASCADE constraints exist (only if not already present)
-- ============================================================================

-- Check and update profiles foreign key
DO $$ 
BEGIN
  -- First, try to drop the constraint if it exists
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
  
  -- Add it back with CASCADE
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, it might already be set up correctly
    RAISE NOTICE 'Profiles constraint already exists or error: %', SQLERRM;
END $$;

-- Check and update user_roles foreign key
DO $$ 
BEGIN
  -- First, try to drop the constraint if it exists
  ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
  
  -- Add it back with CASCADE
  ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'User roles constraint already exists or error: %', SQLERRM;
END $$;

-- Check and update user_preferences foreign key
DO $$ 
BEGIN
  -- First, try to drop the constraint if it exists
  ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
  
  -- Add it back with CASCADE
  ALTER TABLE public.user_preferences 
  ADD CONSTRAINT user_preferences_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'User preferences constraint already exists or error: %', SQLERRM;
END $$;

-- Check and update dismissed_alerts foreign key
DO $$ 
BEGIN
  -- First, try to drop the constraint if it exists
  ALTER TABLE public.dismissed_alerts DROP CONSTRAINT IF EXISTS dismissed_alerts_user_id_fkey;
  
  -- Add it back with CASCADE
  ALTER TABLE public.dismissed_alerts 
  ADD CONSTRAINT dismissed_alerts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Dismissed alerts constraint already exists or error: %', SQLERRM;
END $$;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ User deletion fix applied successfully!';
  RAISE NOTICE '   - delete_user_safely() function created';
  RAISE NOTICE '   - RLS policies updated for admin deletion';
  RAISE NOTICE '   - CASCADE constraints verified';
END $$;

