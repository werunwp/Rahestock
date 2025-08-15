-- Fix foreign key constraint for connection deletion
-- First, set connection_id to null for products when connection is deleted
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_woocommerce_connection_id_fkey;
ALTER TABLE products ADD CONSTRAINT products_woocommerce_connection_id_fkey 
  FOREIGN KEY (woocommerce_connection_id) 
  REFERENCES woocommerce_connections(id) 
  ON DELETE SET NULL;

-- Same for product_variants
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_woocommerce_connection_id_fkey;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_woocommerce_connection_id_fkey 
  FOREIGN KEY (woocommerce_connection_id) 
  REFERENCES woocommerce_connections(id) 
  ON DELETE SET NULL;