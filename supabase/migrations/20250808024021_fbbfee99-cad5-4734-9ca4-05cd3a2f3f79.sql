-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing unique constraints (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE public.products ADD CONSTRAINT products_sku_key UNIQUE (sku);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sales ADD CONSTRAINT sales_invoice_number_key UNIQUE (invoice_number);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing check constraints (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE public.customers ADD CONSTRAINT customers_status_check 
    CHECK (status = ANY (ARRAY['active'::text, 'neutral'::text, 'inactive'::text]));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.inventory_logs ADD CONSTRAINT inventory_logs_type_check 
    CHECK (type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text, 'sale'::text, 'purchase'::text, 'return'::text]));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sales ADD CONSTRAINT sales_payment_status_check 
    CHECK (payment_status = ANY (ARRAY['paid'::text, 'partial'::text, 'pending'::text]));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing foreign key constraints (only if they don't exist)
DO $$ BEGIN
    ALTER TABLE public.inventory_logs ADD CONSTRAINT inventory_logs_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sales_items ADD CONSTRAINT sales_items_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.sales_items ADD CONSTRAINT sales_items_sale_id_fkey 
    FOREIGN KEY (sale_id) REFERENCES public.sales(id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;