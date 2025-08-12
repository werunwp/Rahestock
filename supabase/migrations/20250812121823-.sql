-- Critical Security Fixes: Update RLS Policies and Database Functions

-- 1. Fix business_settings RLS policy - restrict to authenticated users with manager+ roles
DROP POLICY IF EXISTS "Authenticated users can manage business settings" ON public.business_settings;
CREATE POLICY "Managers and admins can manage business settings" 
ON public.business_settings 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

-- 2. Fix system_settings RLS policy - restrict to admin users only
DROP POLICY IF EXISTS "Authenticated users can manage system settings" ON public.system_settings;
CREATE POLICY "Only admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role));

-- 3. Fix sales RLS policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;
CREATE POLICY "Authenticated users can manage sales" 
ON public.sales 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Fix customers RLS policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Authenticated users can manage customers" 
ON public.customers 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Fix products RLS policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authenticated users can manage products" 
ON public.products 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Fix sales_items RLS policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can manage sales items" ON public.sales_items;
CREATE POLICY "Authenticated users can manage sales items" 
ON public.sales_items 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Fix inventory_logs RLS policy - restrict to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can manage inventory logs" ON public.inventory_logs;
CREATE POLICY "Authenticated users can manage inventory logs" 
ON public.inventory_logs 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Fix user_roles RLS policy to prevent privilege escalation
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  has_role(auth.uid(), 'admin'::user_role) AND
  -- Prevent users from escalating their own privileges
  user_id != auth.uid()
);

-- 9. Update database functions to use secure search paths
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    next_number INTEGER;
    invoice_num TEXT;
BEGIN
    -- Get the next number in sequence
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.sales
    WHERE invoice_number ~ '^INV[0-9]+$';
    
    -- Format as INV000001, INV000002, etc.
    invoice_num := 'INV' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN invoice_num;
END;
$function$;