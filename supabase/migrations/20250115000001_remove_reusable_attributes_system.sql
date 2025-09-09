-- Remove reusable attributes system and revert to simple variation system
-- This migration removes the reusable attributes table and related functionality

-- Drop the reusable attributes table and its dependencies
DROP TABLE IF EXISTS public.reusable_attributes CASCADE;

-- Remove reusable attributes from backup controls (this is handled in the app code)
-- The table is already removed from the database

-- Note: We keep the product_attributes and product_attribute_values tables
-- as they are still used by the simple variation system
-- The product_variants table with its attributes JSONB column remains unchanged
