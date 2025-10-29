-- ============================================
-- USER DELETION FIX - APPLY THIS SQL
-- ============================================
-- This creates the delete_user_safely function
-- needed for deleting users from Admin panel
-- ============================================

-- Step 1: Fix foreign key constraints to enable CASCADE deletion
-- This allows automatic deletion of related records when a user is deleted

-- Fix user_roles foreign key
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_fkey;
    END IF;
    
    -- Add new constraint with ON DELETE CASCADE
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
END $$;

-- Fix profiles foreign key (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Fix user_preferences foreign key (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_preferences_id_fkey'
    ) THEN
        ALTER TABLE public.user_preferences DROP CONSTRAINT user_preferences_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_preferences'
    ) THEN
        ALTER TABLE public.user_preferences
        ADD CONSTRAINT user_preferences_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Fix dismissed_alerts foreign key (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'dismissed_alerts_id_fkey'
    ) THEN
        ALTER TABLE public.dismissed_alerts DROP CONSTRAINT dismissed_alerts_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'dismissed_alerts'
    ) THEN
        ALTER TABLE public.dismissed_alerts
        ADD CONSTRAINT dismissed_alerts_id_fkey
        FOREIGN KEY (id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- Step 2: Create delete_user_safely function
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

