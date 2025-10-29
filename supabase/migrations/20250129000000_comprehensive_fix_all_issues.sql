-- Comprehensive Fix for All Supabase Issues
-- This migration resolves all common issues including RLS policies, functions, and schema

-- ============================================================================
-- STEP 1: Drop all existing conflicting policies
-- ============================================================================

-- Business Settings
DROP POLICY IF EXISTS "Authenticated users can manage business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Managers and admins can manage business settings" ON public.business_settings;

-- System Settings
DROP POLICY IF EXISTS "Authenticated users can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can manage system settings" ON public.system_settings;

-- Customers
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Managers and admins can view customers" ON public.customers;
DROP POLICY IF EXISTS "Managers and admins can create customers" ON public.customers;
DROP POLICY IF EXISTS "Managers and admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Managers and admins can delete customers" ON public.customers;

-- Products
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Managers and admins can manage products" ON public.products;

-- Sales
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Staff and above can view sales" ON public.sales;
DROP POLICY IF EXISTS "Staff and above can create sales" ON public.sales;
DROP POLICY IF EXISTS "Managers and admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Managers and admins can delete sales" ON public.sales;

-- Sales Items
DROP POLICY IF EXISTS "Authenticated users can manage sales items" ON public.sales_items;

-- Inventory Logs
DROP POLICY IF EXISTS "Authenticated users can manage inventory logs" ON public.inventory_logs;

-- User Roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Product Variants
DROP POLICY IF EXISTS "Authenticated users can manage product variants" ON public.product_variants;

-- Product Attributes
DROP POLICY IF EXISTS "Authenticated users can manage product attributes" ON public.product_attributes;

-- Product Attribute Values
DROP POLICY IF EXISTS "Authenticated users can manage product attribute values" ON public.product_attribute_values;

-- User Preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;

-- Dismissed Alerts
DROP POLICY IF EXISTS "Users can view their own dismissed alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can create their own dismissed alerts" ON public.dismissed_alerts;
DROP POLICY IF EXISTS "Users can delete their own dismissed alerts" ON public.dismissed_alerts;

-- ============================================================================
-- STEP 2: Ensure has_role function exists and is correct
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================================
-- STEP 3: Create proper RLS policies with correct permissions
-- ============================================================================

-- BUSINESS SETTINGS: Only managers and admins
CREATE POLICY "business_settings_select" 
ON public.business_settings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

CREATE POLICY "business_settings_insert" 
ON public.business_settings 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

CREATE POLICY "business_settings_update" 
ON public.business_settings 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'manager'::user_role)
  )
);

CREATE POLICY "business_settings_delete" 
ON public.business_settings 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- SYSTEM SETTINGS: Admin only
CREATE POLICY "system_settings_all" 
ON public.system_settings 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- CUSTOMERS: All authenticated users
CREATE POLICY "customers_all" 
ON public.customers 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PRODUCTS: All authenticated users
CREATE POLICY "products_all" 
ON public.products 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PRODUCT VARIANTS: All authenticated users
CREATE POLICY "product_variants_all" 
ON public.product_variants 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PRODUCT ATTRIBUTES: All authenticated users
CREATE POLICY "product_attributes_all" 
ON public.product_attributes 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PRODUCT ATTRIBUTE VALUES: All authenticated users
CREATE POLICY "product_attribute_values_all" 
ON public.product_attribute_values 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- SALES: All authenticated users
CREATE POLICY "sales_all" 
ON public.sales 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- SALES ITEMS: All authenticated users
CREATE POLICY "sales_items_all" 
ON public.sales_items 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- INVENTORY LOGS: All authenticated users
CREATE POLICY "inventory_logs_all" 
ON public.inventory_logs 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- USER ROLES: View own, admins can manage all
CREATE POLICY "user_roles_select" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role)
  )
);

CREATE POLICY "user_roles_insert" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "user_roles_update" 
ON public.user_roles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "user_roles_delete" 
ON public.user_roles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- PROFILES: View own, admins can view/update all
CREATE POLICY "profiles_select" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role)
  )
);

CREATE POLICY "profiles_insert" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::user_role)
  )
);

CREATE POLICY "profiles_delete" 
ON public.profiles 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::user_role)
);

-- USER PREFERENCES: Users manage their own
CREATE POLICY "user_preferences_select" 
ON public.user_preferences 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "user_preferences_insert" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_preferences_update" 
ON public.user_preferences 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "user_preferences_delete" 
ON public.user_preferences 
FOR DELETE 
USING (user_id = auth.uid());

-- DISMISSED ALERTS: Users manage their own
CREATE POLICY "dismissed_alerts_select" 
ON public.dismissed_alerts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "dismissed_alerts_insert" 
ON public.dismissed_alerts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "dismissed_alerts_delete" 
ON public.dismissed_alerts 
FOR DELETE 
USING (user_id = auth.uid());

-- ============================================================================
-- STEP 4: Ensure all tables have RLS enabled
-- ============================================================================

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Fix generate_invoice_number function to use dynamic prefix
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  invoice_prefix TEXT;
  formatted_number TEXT;
BEGIN
  -- Get the invoice prefix from business_settings
  SELECT COALESCE(bs.invoice_prefix, '') INTO invoice_prefix
  FROM business_settings bs
  LIMIT 1;
  
  -- Get the next invoice number
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales
  WHERE invoice_number IS NOT NULL 
    AND invoice_number ~ '[0-9]';
  
  -- Format with 5 digits
  formatted_number := LPAD(next_number::TEXT, 5, '0');
  
  -- Return with or without prefix
  IF invoice_prefix IS NOT NULL AND invoice_prefix != '' THEN
    RETURN invoice_prefix || formatted_number;
  ELSE
    RETURN formatted_number;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 6: Ensure all required columns exist
-- ============================================================================

-- Add cn_number to sales if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'cn_number'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN cn_number TEXT;
  END IF;
END $$;

-- Add courier_name to sales if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'courier_name'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN courier_name TEXT;
  END IF;
END $$;

-- Add additional_info to sales if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'additional_info'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN additional_info TEXT;
  END IF;
END $$;

-- Add last_status_check to sales if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'last_status_check'
  ) THEN
    ALTER TABLE public.sales ADD COLUMN last_status_check TIMESTAMPTZ;
  END IF;
END $$;

-- Add invoice_prefix to business_settings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'invoice_prefix'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN invoice_prefix TEXT DEFAULT '';
  END IF;
END $$;

-- Add status_check_webhook_url to business_settings if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_settings' AND column_name = 'status_check_webhook_url'
  ) THEN
    ALTER TABLE public.business_settings ADD COLUMN status_check_webhook_url TEXT;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Create/Update essential database functions
-- ============================================================================

-- Update customer stats function
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_uuid UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        customer_uuid := OLD.customer_id;
    ELSE
        customer_uuid := NEW.customer_id;
    END IF;
    
    -- We don't actually update customer stats here anymore
    -- as they are calculated dynamically in the application
    -- This function is kept for backward compatibility
    
    RETURN NULL;
END;
$$;

-- ============================================================================
-- STEP 8: Create indexes for better performance
-- ============================================================================

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_courier_status ON public.sales(courier_status);

-- Sales items indexes
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product_id ON public.sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_variant_id ON public.sales_items(variant_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================================================
-- STEP 9: Grant necessary permissions
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_stats() TO authenticated;

-- ============================================================================
-- STEP 10: Ensure storage bucket exists and has correct policies
-- ============================================================================

-- Create product_images bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product_images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product_images');

CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'product_images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'product_images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'product_images' AND 
  auth.role() = 'authenticated'
);

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Comprehensive fix completed successfully!';
  RAISE NOTICE 'All RLS policies updated';
  RAISE NOTICE 'All required columns added';
  RAISE NOTICE 'All functions updated';
  RAISE NOTICE 'All indexes created';
  RAISE NOTICE 'Storage bucket configured';
END $$;

