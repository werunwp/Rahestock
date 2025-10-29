-- Fix User Deletion Issues - Add CASCADE constraints and helper function

-- ============================================================================
-- STEP 1: Update foreign key constraints to CASCADE on user deletion
-- ============================================================================

-- Drop existing constraints and recreate with CASCADE
ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.user_preferences 
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

ALTER TABLE public.user_preferences 
  ADD CONSTRAINT user_preferences_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.dismissed_alerts 
  DROP CONSTRAINT IF EXISTS dismissed_alerts_user_id_fkey;

ALTER TABLE public.dismissed_alerts 
  ADD CONSTRAINT dismissed_alerts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: Create a safe delete user function
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
  result JSON;
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
  
  -- Delete related records (will cascade automatically now)
  -- This is redundant but ensures cleanup
  DELETE FROM user_preferences WHERE user_id = target_user_id;
  DELETE FROM dismissed_alerts WHERE user_id = target_user_id;
  DELETE FROM user_roles WHERE user_id = target_user_id;
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
-- STEP 3: Add trigger to clean up orphaned records on auth user deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up any orphaned records
  DELETE FROM user_preferences WHERE user_id = OLD.id;
  DELETE FROM dismissed_alerts WHERE user_id = OLD.id;
  DELETE FROM user_roles WHERE user_id = OLD.id;
  DELETE FROM profiles WHERE user_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Note: We can't directly create triggers on auth.users in Supabase
-- but the CASCADE constraints will handle this automatically

-- ============================================================================
-- STEP 4: Update RLS policies to allow admin user deletion
-- ============================================================================

-- Ensure admins can delete any profile
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

-- Ensure admins can delete any user role
DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;

CREATE POLICY "user_roles_delete" 
ON public.user_roles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- Ensure users can delete their own preferences
DROP POLICY IF EXISTS "user_preferences_delete" ON public.user_preferences;

CREATE POLICY "user_preferences_delete" 
ON public.user_preferences 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Ensure users can delete their own dismissed alerts
DROP POLICY IF EXISTS "dismissed_alerts_delete" ON public.dismissed_alerts;

CREATE POLICY "dismissed_alerts_delete" 
ON public.dismissed_alerts 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::user_role)
);

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'User deletion fix applied successfully!';
  RAISE NOTICE 'Foreign keys now CASCADE on delete';
  RAISE NOTICE 'RLS policies updated for admin deletion';
  RAISE NOTICE 'Helper function delete_user_safely() created';
END $$;

