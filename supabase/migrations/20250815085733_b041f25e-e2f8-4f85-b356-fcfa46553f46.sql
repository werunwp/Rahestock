-- Check current products table structure and test inserting a product manually
INSERT INTO products (
  name,
  sku,
  rate,
  cost,
  stock_quantity,
  low_stock_threshold,
  has_variants,
  created_by,
  woocommerce_id,
  woocommerce_connection_id
) VALUES (
  'Test Product',
  'TEST-001',
  100.00,
  80.00,
  10,
  5,
  false,
  '71e0bdd9-b3d0-4e38-bac6-bd97da64a39a',
  999999,
  '5c53f026-cf46-4c0f-a976-3efbd2f91e44'
) RETURNING id, name;