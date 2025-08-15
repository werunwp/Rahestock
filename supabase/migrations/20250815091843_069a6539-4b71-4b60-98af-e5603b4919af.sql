-- Add missing foreign key constraints and unique constraints for product attributes
-- This ensures data integrity and proper relationships

-- Add unique constraint for product_id and name combination in product_attributes
ALTER TABLE product_attributes DROP CONSTRAINT IF EXISTS product_attributes_product_id_name_key;
ALTER TABLE product_attributes ADD CONSTRAINT product_attributes_product_id_name_key UNIQUE (product_id, name);

-- Add unique constraint for attribute_id and value combination in product_attribute_values  
ALTER TABLE product_attribute_values DROP CONSTRAINT IF EXISTS product_attribute_values_attribute_id_value_key;
ALTER TABLE product_attribute_values ADD CONSTRAINT product_attribute_values_attribute_id_value_key UNIQUE (attribute_id, value);

-- Add foreign key constraint from product_attributes to products
ALTER TABLE product_attributes DROP CONSTRAINT IF EXISTS product_attributes_product_id_fkey;
ALTER TABLE product_attributes ADD CONSTRAINT product_attributes_product_id_fkey 
  FOREIGN KEY (product_id) 
  REFERENCES products(id) 
  ON DELETE CASCADE;

-- Add foreign key constraint from product_attribute_values to product_attributes
ALTER TABLE product_attribute_values DROP CONSTRAINT IF EXISTS product_attribute_values_attribute_id_fkey;
ALTER TABLE product_attribute_values ADD CONSTRAINT product_attribute_values_attribute_id_fkey 
  FOREIGN KEY (attribute_id) 
  REFERENCES product_attributes(id) 
  ON DELETE CASCADE;