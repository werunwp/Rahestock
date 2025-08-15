-- Critical Security Fixes: Implement Role-Based Access Control
-- This migration addresses critical data exposure vulnerabilities

-- 1. CUSTOMERS TABLE: Restrict access to managers and admins only
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;

CREATE POLICY "Managers and admins can view customers" 
ON public.customers 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Managers and admins can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Managers and admins can update customers" 
ON public.customers 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Managers and admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- 2. SALES TABLE: Role-based access with ownership checks
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;

CREATE POLICY "Staff and above can view sales" 
ON public.sales 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'staff'::user_role) OR
   created_by = auth.uid())
);

CREATE POLICY "Staff and above can create sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'staff'::user_role))
);

CREATE POLICY "Managers and admins can update sales" 
ON public.sales 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR
   created_by = auth.uid())
);

CREATE POLICY "Managers and admins can delete sales" 
ON public.sales 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- 3. SALES_ITEMS TABLE: Match sales table restrictions
DROP POLICY IF EXISTS "Authenticated users can manage sales items" ON public.sales_items;

CREATE POLICY "Staff and above can view sales items" 
ON public.sales_items 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'staff'::user_role) OR
   EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sales_items.sale_id AND sales.created_by = auth.uid()))
);

CREATE POLICY "Staff and above can create sales items" 
ON public.sales_items 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR 
   has_role(auth.uid(), 'staff'::user_role))
);

CREATE POLICY "Managers and admins can update sales items" 
ON public.sales_items 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'manager'::user_role) OR
   EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sales_items.sale_id AND sales.created_by = auth.uid()))
);

CREATE POLICY "Managers and admins can delete sales items" 
ON public.sales_items 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- 4. WOOCOMMERCE_IMPORT_LOGS: Remove overly permissive policy
DROP POLICY IF EXISTS "System can manage import logs" ON public.woocommerce_import_logs;

CREATE POLICY "Connection owners can view import logs" 
ON public.woocommerce_import_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.woocommerce_connections 
    WHERE woocommerce_connections.id = woocommerce_import_logs.connection_id 
    AND woocommerce_connections.user_id = auth.uid()
  )
);

CREATE POLICY "System can create import logs" 
ON public.woocommerce_import_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update import logs" 
ON public.woocommerce_import_logs 
FOR UPDATE 
USING (true);

-- 5. BUSINESS_SETTINGS: Restrict to admin/manager roles only
DROP POLICY IF EXISTS "Managers and admins can manage business settings" ON public.business_settings;

CREATE POLICY "Admins and managers can view business settings" 
ON public.business_settings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Admins and managers can create business settings" 
ON public.business_settings 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Admins and managers can update business settings" 
ON public.business_settings 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

CREATE POLICY "Admins and managers can delete business settings" 
ON public.business_settings 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role))
);

-- 6. Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- 7. Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_logs (user_id, action, table_name, record_id)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    NULL;
END;
$$;