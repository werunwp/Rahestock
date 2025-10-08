-- Complete Database Schema Setup for Inventory App
-- This matches the actual schema from your old database
-- Run this in your new Supabase SQL Editor

-- 1. Create user roles enum (if not exists)
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create business_settings table
CREATE TABLE IF NOT EXISTS public.business_settings (
  low_stock_alert_quantity integer DEFAULT 10,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'Your Business Name'::text,
  invoice_prefix text DEFAULT 'INV'::text,
  logo_url text,
  phone text,
  whatsapp text,
  email text,
  facebook text,
  address text,
  created_by uuid,
  primary_email text,
  secondary_email text,
  address_line1 text,
  address_line2 text,
  business_hours text,
  invoice_footer_message text DEFAULT 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  brand_color text DEFAULT '#2c7be5'::text,
  CONSTRAINT business_settings_pkey PRIMARY KEY (id),
  CONSTRAINT business_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 3. Create courier_webhook_settings table
CREATE TABLE IF NOT EXISTS public.courier_webhook_settings (
  status_check_webhook_url text NOT NULL,
  webhook_url text NOT NULL,
  webhook_description text,
  auth_username text,
  auth_password text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  webhook_name text NOT NULL DEFAULT 'Courier Webhook'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT courier_webhook_settings_pkey PRIMARY KEY (id)
);

-- 4. Create custom_settings table
CREATE TABLE IF NOT EXISTS public.custom_settings (
  setting_type text NOT NULL UNIQUE CHECK (setting_type = ANY (ARRAY['custom_css'::text, 'head_snippet'::text, 'body_snippet'::text])),
  content text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_settings_pkey PRIMARY KEY (id)
);

-- 5. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  email character varying,
  delivered_count integer DEFAULT 0,
  name text NOT NULL,
  phone text,
  address text,
  whatsapp text,
  created_by uuid,
  last_purchase_date timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tags text[] DEFAULT '{}'::text[],
  total_spent numeric DEFAULT 0,
  order_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'inactive'::text CHECK (status = ANY (ARRAY['active'::text, 'neutral'::text, 'inactive'::text])),
  cancelled_count integer DEFAULT 0,
  additional_info text,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 6. Create dismissed_alerts table
CREATE TABLE IF NOT EXISTS public.dismissed_alerts (
  user_id uuid NOT NULL,
  alert_id text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dismissed_alerts_pkey PRIMARY KEY (id)
);

-- 7. Create products table
CREATE TABLE IF NOT EXISTS public.products (
  name text NOT NULL,
  image_url text,
  size text,
  color text,
  sku text UNIQUE,
  rate numeric NOT NULL,
  cost numeric,
  created_by uuid,
  woocommerce_id integer,
  woocommerce_connection_id uuid,
  last_synced_at timestamp with time zone,
  deleted_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stock_quantity integer DEFAULT 0,
  low_stock_threshold integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  has_variants boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 8. Create product_attributes table
CREATE TABLE IF NOT EXISTS public.product_attributes (
  product_id uuid NOT NULL,
  name text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_attributes_pkey PRIMARY KEY (id),
  CONSTRAINT product_attributes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- 9. Create product_attribute_values table
CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  attribute_id uuid NOT NULL,
  value text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_attribute_values_pkey PRIMARY KEY (id),
  CONSTRAINT product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.product_attributes(id)
);

-- 10. Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  product_id uuid NOT NULL,
  attributes jsonb NOT NULL,
  sku text UNIQUE,
  rate numeric,
  cost numeric,
  low_stock_threshold integer,
  image_url text,
  woocommerce_id integer,
  last_synced_at timestamp with time zone,
  woocommerce_connection_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- 11. Create inventory_logs table
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  product_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text, 'sale'::text, 'purchase'::text, 'return'::text])),
  quantity integer NOT NULL,
  reason text,
  created_by uuid,
  variant_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_logs_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT inventory_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT inventory_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 12. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text,
  phone text,
  full_name text NOT NULL DEFAULT 'Unknown User'::text,
  role text DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- 13. Create reusable_attributes table
CREATE TABLE IF NOT EXISTS public.reusable_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  name text UNIQUE CHECK (length(name) <= 100),
  display_name text CHECK (length(display_name) <= 100),
  type text DEFAULT '''text'''::text CHECK (type = ANY (ARRAY['text'::text, 'select'::text, 'number'::text, 'color'::text, 'size'::text])),
  options jsonb,
  is_required boolean DEFAULT false,
  CONSTRAINT reusable_attributes_pkey PRIMARY KEY (id),
  CONSTRAINT reusable_attributes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 14. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role user_role NOT NULL,
  permission_key text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id)
);

-- 15. Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  webhook_updated_at timestamp with time zone,
  fee numeric DEFAULT 0.00,
  total_amount numeric DEFAULT 0.00,
  status text DEFAULT 'completed'::text,
  city text,
  zone text,
  area text,
  merchant_order_id text,
  invoice_number text NOT NULL UNIQUE,
  customer_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  customer_address text,
  customer_whatsapp text,
  subtotal numeric NOT NULL,
  grand_total numeric NOT NULL,
  payment_method text NOT NULL,
  created_by uuid,
  consignment_id text,
  last_status_check timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  amount_due numeric DEFAULT 0,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'partial'::text, 'paid'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  order_status text DEFAULT 'pending'::text,
  courier_status text DEFAULT 'not_sent'::text,
  charge numeric NOT NULL DEFAULT 0,
  order_status_slug text,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamp with time zone,
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- 16. Create sale_items table
CREATE TABLE IF NOT EXISTS public.sale_items (
  product_id uuid,
  variant_id uuid,
  total_price numeric NOT NULL CHECK (total_price >= 0::numeric),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quantity integer NOT NULL CHECK (quantity > 0),
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sale_id uuid NOT NULL,
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  CONSTRAINT sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT fk_sale_items_variant_id FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT fk_sale_items_product_id FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT fk_sale_items_sale_id FOREIGN KEY (sale_id) REFERENCES public.sales(id)
);

-- 17. Create sales_items table (legacy)
CREATE TABLE IF NOT EXISTS public.sales_items (
  sale_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  rate numeric NOT NULL,
  total numeric NOT NULL,
  variant_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_items_pkey PRIMARY KEY (id),
  CONSTRAINT sales_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id),
  CONSTRAINT sales_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id),
  CONSTRAINT sales_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- 18. Create security_audit_logs table
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  ip_address inet,
  user_agent text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT security_audit_logs_pkey PRIMARY KEY (id)
);

-- 19. Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  currency_symbol text DEFAULT '৳'::text,
  currency_code text DEFAULT 'BDT'::text,
  timezone text DEFAULT 'Asia/Dhaka'::text,
  date_format text DEFAULT 'DD/MM/YYYY'::text,
  time_format text DEFAULT 'HH:mm'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);

-- 20. Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_notifications boolean NOT NULL DEFAULT true,
  low_stock_alerts boolean NOT NULL DEFAULT true,
  sales_reports boolean NOT NULL DEFAULT true,
  dark_mode boolean NOT NULL DEFAULT false,
  compact_view boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id)
);

-- 21. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role user_role NOT NULL DEFAULT 'staff'::user_role,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 22. Create woocommerce_connections table
CREATE TABLE IF NOT EXISTS public.woocommerce_connections (
  user_id uuid NOT NULL,
  site_name text NOT NULL,
  site_url text NOT NULL,
  consumer_key text NOT NULL,
  consumer_secret text NOT NULL,
  last_import_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  total_products_imported integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT woocommerce_connections_pkey PRIMARY KEY (id)
);

-- 23. Create woocommerce_import_logs table
CREATE TABLE IF NOT EXISTS public.woocommerce_import_logs (
  connection_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])),
  error_message text,
  completed_at timestamp with time zone,
  progress_message text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  total_products integer DEFAULT 0,
  imported_products integer DEFAULT 0,
  failed_products integer DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  current_page integer DEFAULT 0,
  total_pages integer DEFAULT 0,
  CONSTRAINT woocommerce_import_logs_pkey PRIMARY KEY (id),
  CONSTRAINT woocommerce_import_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.woocommerce_connections(id)
);

-- 24. Create woocommerce_sync_logs table
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_logs (
  connection_id uuid NOT NULL,
  sync_type text NOT NULL CHECK (sync_type = ANY (ARRAY['manual'::text, 'scheduled'::text])),
  error_message text,
  completed_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'failed'::text])),
  products_updated integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_failed integer DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT woocommerce_sync_logs_pkey PRIMARY KEY (id),
  CONSTRAINT woocommerce_sync_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.woocommerce_connections(id)
);

-- 25. Create woocommerce_sync_schedules table
CREATE TABLE IF NOT EXISTS public.woocommerce_sync_schedules (
  connection_id uuid NOT NULL,
  sync_time time without time zone,
  last_sync_at timestamp with time zone,
  next_sync_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  sync_interval_minutes integer NOT NULL DEFAULT 60,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT woocommerce_sync_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT woocommerce_sync_schedules_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.woocommerce_connections(id)
);

-- Enable RLS on all tables
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_webhook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reusable_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_sync_schedules ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create RLS policies for all tables
-- Business settings
DROP POLICY IF EXISTS "Authenticated users can manage business settings" ON public.business_settings;
CREATE POLICY "Authenticated users can manage business settings" ON public.business_settings
FOR ALL TO authenticated
USING (true);

-- Courier webhook settings
DROP POLICY IF EXISTS "Authenticated users can manage courier webhook settings" ON public.courier_webhook_settings;
CREATE POLICY "Authenticated users can manage courier webhook settings" ON public.courier_webhook_settings
FOR ALL TO authenticated
USING (true);

-- Custom settings
DROP POLICY IF EXISTS "Authenticated users can manage custom settings" ON public.custom_settings;
CREATE POLICY "Authenticated users can manage custom settings" ON public.custom_settings
FOR ALL TO authenticated
USING (true);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
CREATE POLICY "Authenticated users can manage customers" ON public.customers
FOR ALL TO authenticated
USING (true);

-- Dismissed alerts
DROP POLICY IF EXISTS "Users can manage their own dismissed alerts" ON public.dismissed_alerts;
CREATE POLICY "Users can manage their own dismissed alerts" ON public.dismissed_alerts
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- Products
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authenticated users can manage products" ON public.products
FOR ALL TO authenticated
USING (true);

-- Product attributes
DROP POLICY IF EXISTS "Authenticated users can manage product attributes" ON public.product_attributes;
CREATE POLICY "Authenticated users can manage product attributes" ON public.product_attributes
FOR ALL TO authenticated
USING (true);

-- Product attribute values
DROP POLICY IF EXISTS "Authenticated users can manage product attribute values" ON public.product_attribute_values;
CREATE POLICY "Authenticated users can manage product attribute values" ON public.product_attribute_values
FOR ALL TO authenticated
USING (true);

-- Product variants
DROP POLICY IF EXISTS "Authenticated users can manage product variants" ON public.product_variants;
CREATE POLICY "Authenticated users can manage product variants" ON public.product_variants
FOR ALL TO authenticated
USING (true);

-- Inventory logs
DROP POLICY IF EXISTS "Authenticated users can manage inventory logs" ON public.inventory_logs;
CREATE POLICY "Authenticated users can manage inventory logs" ON public.inventory_logs
FOR ALL TO authenticated
USING (true);

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Reusable attributes
DROP POLICY IF EXISTS "Authenticated users can manage reusable attributes" ON public.reusable_attributes;
CREATE POLICY "Authenticated users can manage reusable attributes" ON public.reusable_attributes
FOR ALL TO authenticated
USING (true);

-- Role permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Sales
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;
CREATE POLICY "Authenticated users can manage sales" ON public.sales
FOR ALL TO authenticated
USING (true);

-- Sale items
DROP POLICY IF EXISTS "Authenticated users can manage sale items" ON public.sale_items;
CREATE POLICY "Authenticated users can manage sale items" ON public.sale_items
FOR ALL TO authenticated
USING (true);

-- Sales items
DROP POLICY IF EXISTS "Authenticated users can manage sales items" ON public.sales_items;
CREATE POLICY "Authenticated users can manage sales items" ON public.sales_items
FOR ALL TO authenticated
USING (true);

-- Security audit logs
DROP POLICY IF EXISTS "Authenticated users can view security audit logs" ON public.security_audit_logs;
CREATE POLICY "Authenticated users can view security audit logs" ON public.security_audit_logs
FOR SELECT TO authenticated
USING (true);

-- System settings
DROP POLICY IF EXISTS "Authenticated users can manage system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can manage system settings" ON public.system_settings
FOR ALL TO authenticated
USING (true);

-- User preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage their own preferences" ON public.user_preferences
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- User roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- WooCommerce connections
DROP POLICY IF EXISTS "Users can manage their own WooCommerce connections" ON public.woocommerce_connections;
CREATE POLICY "Users can manage their own WooCommerce connections" ON public.woocommerce_connections
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- WooCommerce import logs
DROP POLICY IF EXISTS "Users can view their own WooCommerce import logs" ON public.woocommerce_import_logs;
CREATE POLICY "Users can view their own WooCommerce import logs" ON public.woocommerce_import_logs
FOR SELECT TO authenticated
USING (true);

-- WooCommerce sync logs
DROP POLICY IF EXISTS "Users can view their own WooCommerce sync logs" ON public.woocommerce_sync_logs;
CREATE POLICY "Users can view their own WooCommerce sync logs" ON public.woocommerce_sync_logs
FOR SELECT TO authenticated
USING (true);

-- WooCommerce sync schedules
DROP POLICY IF EXISTS "Users can manage their own WooCommerce sync schedules" ON public.woocommerce_sync_schedules;
CREATE POLICY "Users can manage their own WooCommerce sync schedules" ON public.woocommerce_sync_schedules
FOR ALL TO authenticated
USING (true);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all relevant tables
CREATE TRIGGER update_business_settings_updated_at
    BEFORE UPDATE ON public.business_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courier_webhook_settings_updated_at
    BEFORE UPDATE ON public.courier_webhook_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_settings_updated_at
    BEFORE UPDATE ON public.custom_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON public.product_variants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reusable_attributes_updated_at
    BEFORE UPDATE ON public.reusable_attributes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_woocommerce_connections_updated_at
    BEFORE UPDATE ON public.woocommerce_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_woocommerce_sync_schedules_updated_at
    BEFORE UPDATE ON public.woocommerce_sync_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'));
  
  -- Give first user admin role, others get staff role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 
    CASE 
      WHEN (SELECT COUNT(*) FROM auth.users) = 1 THEN 'admin'::user_role
      ELSE 'staff'::user_role
    END
  );
  
  RETURN new;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;
