-- First, ensure existing users have roles (give first user admin, others staff)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id as user_id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY created_at) = 1 THEN 'admin'::public.user_role
    ELSE 'staff'::public.user_role
  END as role
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Update the handle_new_user function to create both profile and role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'));
  
  -- Give first user admin role, others get staff role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::public.user_role
      ELSE 'staff'::public.user_role
    END
  );
  
  RETURN new;
END;
$function$;