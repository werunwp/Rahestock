-- Migration to Self-Hosted Supabase
-- This script recreates the complete schema, functions, triggers, and policies

-- Step 1: Create custom types
CREATE TYPE public.user_role AS ENUM ('admin', 'staff');

-- Step 2: Create all tables with their complete structure

-- Business Settings Table
CREATE TABLE public.business_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name text NOT NULL DEFAULT 'Your Business Name'::text,
    logo_url text,
    phone text,
    whatsapp text,
    email text,
    facebook text,
    address text,
    invoice_prefix text DEFAULT 'INV'::text,
    invoice_footer_message text DEFAULT 'ধন্যবাদ আপনার সাথে ব্যবসা করার জন্য'::text,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Customers Table
CREATE TABLE public.customers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    phone text,
    whatsapp text,
    address text,
    tags text[] DEFAULT '{}'::text[],
    order_count integer DEFAULT 0,
    total_spent numeric DEFAULT 0,
    last_purchase_date timestamp with time zone,
    status text DEFAULT 'inactive'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Dismissed Alerts Table
CREATE TABLE public.dismissed_alerts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    alert_id text NOT NULL,
    dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inventory Logs Table
CREATE TABLE public.inventory_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL,
    type text NOT NULL,
    quantity integer NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- Products Table
CREATE TABLE public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    sku text,
    rate numeric NOT NULL,
    cost numeric,
    stock_quantity integer DEFAULT 0,
    low_stock_threshold integer DEFAULT 10,
    size text,
    color text,
    image_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Sales Table
CREATE TABLE public.sales (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number text NOT NULL,
    customer_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    customer_address text,
    customer_whatsapp text,
    subtotal numeric NOT NULL,
    discount_percent numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    charge numeric DEFAULT 0,
    grand_total numeric NOT NULL,
    payment_method text NOT NULL,
    payment_status text DEFAULT 'pending'::text,
    amount_paid numeric DEFAULT 0,
    amount_due numeric DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Sales Items Table
CREATE TABLE public.sales_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    rate numeric NOT NULL,
    total numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- System Settings Table
CREATE TABLE public.system_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    currency_code text NOT NULL DEFAULT 'BDT'::text,
    currency_symbol text NOT NULL DEFAULT '৳'::text,
    timezone text NOT NULL DEFAULT 'Asia/Dhaka'::text,
    date_format text NOT NULL DEFAULT 'dd/MM/yyyy'::text,
    time_format text NOT NULL DEFAULT '12h'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- User Roles Table
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    role public.user_role NOT NULL DEFAULT 'staff'::public.user_role,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Step 3: Create database functions

-- Update updated_at column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Handle new user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Has role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

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

-- Step 4: Create triggers

-- Updated at triggers
CREATE TRIGGER update_business_settings_updated_at
    BEFORE UPDATE ON public.business_settings
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

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Customer stats trigger
CREATE TRIGGER update_customer_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_customer_stats();

-- New user trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();