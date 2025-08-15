-- Fix product variants table for proper variation import
-- Add unique constraints and fix the import process

-- Add unique constraint for product_variants to handle ON CONFLICT
-- This allows proper upsert operations during WooCommerce import
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_woocommerce_id_key;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_product_id_woocommerce_id_key 
  UNIQUE (product_id, woocommerce_id);

-- Also add a constraint for woocommerce_connection_id + woocommerce_id to handle cross-connection uniqueness
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_woocommerce_connection_id_woocommerce_id_key;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_woocommerce_connection_id_woocommerce_id_key 
  UNIQUE (woocommerce_connection_id, woocommerce_id);

-- Ensure products table also has proper constraints for WooCommerce imports
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_woocommerce_connection_id_woocommerce_id_key;
ALTER TABLE products ADD CONSTRAINT products_woocommerce_connection_id_woocommerce_id_key 
  UNIQUE (woocommerce_connection_id, woocommerce_id);