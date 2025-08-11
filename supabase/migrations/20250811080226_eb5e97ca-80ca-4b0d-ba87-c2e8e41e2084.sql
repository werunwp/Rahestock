-- Add manager and viewer roles to the existing enum
ALTER TYPE public.user_role ADD VALUE 'manager';
ALTER TYPE public.user_role ADD VALUE 'viewer';

-- Disable public signup (only admins can create users)
UPDATE auth.config SET allow_signup = false;