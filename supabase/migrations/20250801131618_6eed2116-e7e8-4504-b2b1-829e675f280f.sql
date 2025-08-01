-- Fix the search path for the update_customer_stats function
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
    customer_uuid UUID;
BEGIN
    -- Get customer_id from the affected row
    IF TG_OP = 'DELETE' THEN
        customer_uuid := OLD.customer_id;
    ELSE
        customer_uuid := NEW.customer_id;
    END IF;
    
    -- Skip if no customer_id
    IF customer_uuid IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Update customer statistics
    UPDATE public.customers 
    SET 
        order_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        total_spent = (
            SELECT COALESCE(SUM(grand_total), 0) 
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        last_purchase_date = (
            SELECT MAX(created_at)
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        updated_at = now()
    WHERE id = customer_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix the search path for the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
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
$$;