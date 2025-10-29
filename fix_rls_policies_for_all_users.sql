-- Fix RLS policies to allow ALL authenticated users to see ALL data
-- Data visibility should NOT be restricted by who created it
-- Role-based permissions are handled in the app logic, not RLS

-- ============================================
-- PRODUCTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Users can view products" ON public.products;
DROP POLICY IF EXISTS "Users can insert products" ON public.products;
DROP POLICY IF EXISTS "Users can update products" ON public.products;
DROP POLICY IF EXISTS "Users can delete products" ON public.products;

CREATE POLICY "All authenticated users can view all products" 
ON public.products FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert products" 
ON public.products FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update products" 
ON public.products FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete products" 
ON public.products FOR DELETE 
TO authenticated 
USING (true);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;

CREATE POLICY "All authenticated users can view all customers" 
ON public.customers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert customers" 
ON public.customers FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update customers" 
ON public.customers FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete customers" 
ON public.customers FOR DELETE 
TO authenticated 
USING (true);

-- ============================================
-- SALES TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete sales" ON public.sales;

CREATE POLICY "All authenticated users can view all sales" 
ON public.sales FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert sales" 
ON public.sales FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update sales" 
ON public.sales FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete sales" 
ON public.sales FOR DELETE 
TO authenticated 
USING (true);

-- ============================================
-- SALES ITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage sales items" ON public.sales_items;
DROP POLICY IF EXISTS "Users can view sales_items" ON public.sales_items;
DROP POLICY IF EXISTS "Users can insert sales_items" ON public.sales_items;
DROP POLICY IF EXISTS "Users can update sales_items" ON public.sales_items;
DROP POLICY IF EXISTS "Users can delete sales_items" ON public.sales_items;

CREATE POLICY "All authenticated users can view all sales_items" 
ON public.sales_items FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert sales_items" 
ON public.sales_items FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update sales_items" 
ON public.sales_items FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete sales_items" 
ON public.sales_items FOR DELETE 
TO authenticated 
USING (true);

-- ============================================
-- INVENTORY LOGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Users can view inventory_logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Users can insert inventory_logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Users can update inventory_logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Users can delete inventory_logs" ON public.inventory_logs;

CREATE POLICY "All authenticated users can view all inventory_logs" 
ON public.inventory_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert inventory_logs" 
ON public.inventory_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update inventory_logs" 
ON public.inventory_logs FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete inventory_logs" 
ON public.inventory_logs FOR DELETE 
TO authenticated 
USING (true);

-- ============================================
-- PRODUCT VARIANTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can view product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can insert product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can update product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Users can delete product_variants" ON public.product_variants;

CREATE POLICY "All authenticated users can view all product_variants" 
ON public.product_variants FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can insert product_variants" 
ON public.product_variants FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "All authenticated users can update product_variants" 
ON public.product_variants FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "All authenticated users can delete product_variants" 
ON public.product_variants FOR DELETE 
TO authenticated 
USING (true);

-- ============================================
-- BUSINESS SETTINGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can view business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can update business_settings" ON public.business_settings;

CREATE POLICY "All authenticated users can view business_settings" 
ON public.business_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can update business_settings" 
ON public.business_settings FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can view system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can update system_settings" ON public.system_settings;

CREATE POLICY "All authenticated users can view system_settings" 
ON public.system_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "All authenticated users can update system_settings" 
ON public.system_settings FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- ============================================
-- SUMMARY
-- ============================================
-- All tables now allow:
-- 1. ANY authenticated user can view ALL data
-- 2. ANY authenticated user can create/update/delete data
-- 3. Role-based permissions are enforced in the application layer
-- 4. Data is NOT restricted by who created it

