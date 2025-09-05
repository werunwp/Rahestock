-- Create the missing get_all_users_with_roles function
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    COALESCE(ur.role, 'user') as role,
    p.created_at,
    p.last_sign_in_at
  FROM profiles p
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  ORDER BY p.created_at DESC;
$$;
