# 🚨 URGENT: Fix RLS Policy for Login Issue

## Problem
Users cannot login because of: **"new row violates row-level security policy for table 'user_roles'"**

## Solution
Run the following SQL commands in your Supabase dashboard to fix the RLS policies.

## Steps to Fix:

1. **Go to Supabase Dashboard**: https://supabase.rahedeen.com/
2. **Navigate to**: SQL Editor (in the left sidebar)
3. **Create a new query** and paste the SQL below
4. **Click "Run"** to execute

## SQL Commands to Execute:

```sql
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
```

## What This Fix Does:

1. ✅ **Removes old restrictive policies** that prevented users from accessing their roles
2. ✅ **Allows users to view their own roles** - Fixes the login issue
3. ✅ **Allows users to insert their own roles** - Fixes user creation
4. ✅ **Maintains admin control** - Admins can still manage other users
5. ✅ **Prevents self-lockout** - Admins can update their own roles

## After Running the SQL:

- **Login will work again** ✅
- **User creation will work** ✅
- **No more RLS policy errors** ✅

## Alternative: Run via Migration File

If you have Supabase CLI installed, you can also run:
```bash
supabase db push
```

The migration file is already created at:
`supabase/migrations/20250128000005_fix_user_roles_rls_policy.sql`

---

**Status**: ⏳ Waiting for you to apply this fix in Supabase Dashboard
**Priority**: 🚨 URGENT - This is blocking all user logins


