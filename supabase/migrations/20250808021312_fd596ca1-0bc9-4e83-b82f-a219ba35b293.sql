-- Ensure user has a profile - create missing profile for existing user
INSERT INTO public.profiles (user_id, full_name)
SELECT 
  id,
  COALESCE(raw_user_meta_data ->> 'full_name', 'User') as full_name
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;