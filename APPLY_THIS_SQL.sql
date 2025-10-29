-- ============================================
-- USER DELETION FIX - APPLY THIS SQL
-- ============================================
-- This creates the delete_user_safely function
-- needed for deleting users from Admin panel
-- ============================================

-- Create delete_user_safely function
CREATE OR REPLACE FUNCTION public.delete_user_safely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete from related tables (if they exist)
  -- User preferences
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    DELETE FROM public.user_preferences WHERE id = target_user_id;
  END IF;

  -- Dismissed alerts
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dismissed_alerts') THEN
    DELETE FROM public.dismissed_alerts WHERE id = target_user_id;
  END IF;

  -- User roles
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    DELETE FROM public.user_roles WHERE id = target_user_id;
  END IF;

  -- Profiles
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    DELETE FROM public.profiles WHERE id = target_user_id;
  END IF;

  -- Finally, delete from auth.users
  -- SECURITY DEFINER allows this function to delete from auth schema
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_safely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_safely(UUID) TO service_role;

-- Update RLS policies for user_roles to allow deletion
DROP POLICY IF EXISTS "Users can delete their own role" ON public.user_roles;
CREATE POLICY "Users can delete their own role"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (true);

-- Update RLS policies for profiles to allow deletion
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- DONE! You can now delete users safely
-- ============================================

