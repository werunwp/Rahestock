-- Continue migration: Create RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Business Settings Policies
CREATE POLICY "Authenticated users can manage business settings" 
ON public.business_settings 
FOR ALL 
USING (true);

-- Customers Policies
CREATE POLICY "Authenticated users can manage customers" 
ON public.customers 
FOR ALL 
USING (true);

-- Dismissed Alerts Policies
CREATE POLICY "Users can view their own dismissed alerts" 
ON public.dismissed_alerts 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own dismissed alerts" 
ON public.dismissed_alerts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own dismissed alerts" 
ON public.dismissed_alerts 
FOR DELETE 
USING (user_id = auth.uid());

-- Inventory Logs Policies
CREATE POLICY "Authenticated users can manage inventory logs" 
ON public.inventory_logs 
FOR ALL 
USING (true);

-- Products Policies
CREATE POLICY "Authenticated users can manage products" 
ON public.products 
FOR ALL 
USING (true);

-- Profiles Policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- Sales Policies
CREATE POLICY "Authenticated users can manage sales" 
ON public.sales 
FOR ALL 
USING (true);

-- Sales Items Policies
CREATE POLICY "Authenticated users can manage sales items" 
ON public.sales_items 
FOR ALL 
USING (true);

-- System Settings Policies
CREATE POLICY "Authenticated users can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (true);

-- User Roles Policies
CREATE POLICY "Admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images');

CREATE POLICY "Users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images');