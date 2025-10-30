-- ============================================
-- FIX USER PREFERENCES RLS POLICIES
-- ============================================
-- Run this in Supabase SQL Editor to fix the
-- "Failed to update preferences" error
-- ============================================

-- Step 1: Check if user_preferences table exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_preferences'
    ) THEN
        RAISE NOTICE 'user_preferences table does not exist!';
    ELSE
        RAISE NOTICE 'user_preferences table exists';
    END IF;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can create their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can select own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_select" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_update" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete" ON public.user_preferences;

-- Step 4: Create fresh policies with simple names (drop first to avoid conflicts)
DROP POLICY IF EXISTS "select_own_preferences" ON public.user_preferences;
CREATE POLICY "select_own_preferences" 
ON public.user_preferences 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_preferences" ON public.user_preferences;
CREATE POLICY "insert_own_preferences" 
ON public.user_preferences 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_preferences" ON public.user_preferences;
CREATE POLICY "update_own_preferences" 
ON public.user_preferences 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_preferences" ON public.user_preferences;
CREATE POLICY "delete_own_preferences" 
ON public.user_preferences 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Step 5: Fix foreign key constraint
DO $$ 
BEGIN
    -- Drop any existing constraints
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_preferences_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_preferences DROP CONSTRAINT user_preferences_user_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_preferences_id_fkey'
    ) THEN
        ALTER TABLE public.user_preferences DROP CONSTRAINT user_preferences_id_fkey;
    END IF;
    
    -- Add correct constraint
    ALTER TABLE public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint fixed';
END $$;

-- Step 6: Fix dismissed_alerts RLS policies
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- Drop all existing dismissed_alerts policies
DROP POLICY IF EXISTS "Users can view their own dismissed alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can create their own dismissed alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can insert their own dismissed alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can delete their own dismissed alerts" ON public.dismissed_alerts;

-- Create fresh policies for dismissed_alerts (drop first to avoid conflicts)
DROP POLICY IF EXISTS "select_own_dismissed_alerts" ON public.dismissed_alerts;
CREATE POLICY "select_own_dismissed_alerts" 
ON public.dismissed_alerts 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_dismissed_alerts" ON public.dismissed_alerts;
CREATE POLICY "insert_own_dismissed_alerts" 
ON public.dismissed_alerts 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_dismissed_alerts" ON public.dismissed_alerts;
CREATE POLICY "delete_own_dismissed_alerts" 
ON public.dismissed_alerts 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- Fix dismissed_alerts foreign key constraint
DO $$ 
BEGIN
    -- Drop any existing constraints
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'dismissed_alerts_user_id_fkey'
    ) THEN
        ALTER TABLE public.dismissed_alerts DROP CONSTRAINT dismissed_alerts_user_id_fkey;
    END IF;
    
    -- Add correct constraint
    ALTER TABLE public.dismissed_alerts
    ADD CONSTRAINT dismissed_alerts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Dismissed alerts foreign key constraint fixed';
END $$;

-- Step 7: Verify the setup
DO $$
DECLARE
    prefs_policy_count INTEGER;
    alerts_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO prefs_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'user_preferences';
    
    SELECT COUNT(*) INTO alerts_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'dismissed_alerts';
    
    RAISE NOTICE 'Total RLS policies on user_preferences: %', prefs_policy_count;
    RAISE NOTICE 'Total RLS policies on dismissed_alerts: %', alerts_policy_count;
END $$;

-- ============================================
-- DONE! Test:
-- 1. Settings > Appearance: Toggle Dark Mode or Compact View
-- 2. Alerts page: Dismiss any alert
-- Both should work without errors now!
-- ============================================

