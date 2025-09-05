-- Check Profiles Table Structure
-- Run this in your Supabase SQL Editor to see what columns exist

-- Check if profiles table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Check if there are any rows in the profiles table
SELECT COUNT(*) as row_count FROM public.profiles;
