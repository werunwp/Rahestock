-- Add additional_info field to sales table and remove city/zone/area fields
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS additional_info TEXT,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS zone,
DROP COLUMN IF EXISTS area;

-- Add comment for documentation
COMMENT ON COLUMN sales.additional_info IS 'Additional customer information from customer record';
