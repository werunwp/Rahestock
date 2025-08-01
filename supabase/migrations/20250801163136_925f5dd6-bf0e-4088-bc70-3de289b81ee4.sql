-- Fix all remaining functions with search path issues
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;