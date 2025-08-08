-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing foreign key constraints
ALTER TABLE public.business_settings 
ADD CONSTRAINT business_settings_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.customers 
ADD CONSTRAINT customers_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.inventory_logs 
ADD CONSTRAINT inventory_logs_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.inventory_logs 
ADD CONSTRAINT inventory_logs_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.products 
ADD CONSTRAINT products_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.sales 
ADD CONSTRAINT sales_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE public.sales 
ADD CONSTRAINT sales_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public.sales_items 
ADD CONSTRAINT sales_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE public.sales_items 
ADD CONSTRAINT sales_items_sale_id_fkey 
FOREIGN KEY (sale_id) REFERENCES public.sales(id);

ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Add missing unique constraints
ALTER TABLE public.products 
ADD CONSTRAINT products_sku_key 
UNIQUE (sku);

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_key 
UNIQUE (user_id);

ALTER TABLE public.sales 
ADD CONSTRAINT sales_invoice_number_key 
UNIQUE (invoice_number);

ALTER TABLE public.user_preferences 
ADD CONSTRAINT user_preferences_user_id_key 
UNIQUE (user_id);

-- Add missing check constraints
ALTER TABLE public.customers 
ADD CONSTRAINT customers_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'neutral'::text, 'inactive'::text]));

ALTER TABLE public.inventory_logs 
ADD CONSTRAINT inventory_logs_type_check 
CHECK (type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text, 'sale'::text, 'purchase'::text, 'return'::text]));

ALTER TABLE public.sales 
ADD CONSTRAINT sales_payment_status_check 
CHECK (payment_status = ANY (ARRAY['paid'::text, 'partial'::text, 'pending'::text]));