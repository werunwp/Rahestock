-- Fix negative stock values and add constraints to prevent future negative stock

-- 1. Fix any existing negative stock values in products table
UPDATE public.products 
SET stock_quantity = 0 
WHERE stock_quantity < 0;

-- 2. Fix any existing negative stock values in product_variants table
UPDATE public.product_variants 
SET stock_quantity = 0 
WHERE stock_quantity < 0;

-- 3. Add check constraints to prevent negative stock in the future
ALTER TABLE public.products 
ADD CONSTRAINT check_stock_quantity_non_negative 
CHECK (stock_quantity >= 0);

ALTER TABLE public.product_variants 
ADD CONSTRAINT check_variant_stock_quantity_non_negative 
CHECK (stock_quantity >= 0);

-- 4. Create a function to safely update stock quantities
CREATE OR REPLACE FUNCTION public.safe_update_stock(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity_change integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stock integer;
  new_stock integer;
BEGIN
  -- Get current stock
  IF p_variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO current_stock 
    FROM public.product_variants 
    WHERE id = p_variant_id;
  ELSE
    SELECT stock_quantity INTO current_stock 
    FROM public.products 
    WHERE id = p_product_id;
  END IF;
  
  -- Calculate new stock (ensure it doesn't go below 0)
  new_stock := GREATEST(0, (current_stock + p_quantity_change));
  
  -- Update stock
  IF p_variant_id IS NOT NULL THEN
    UPDATE public.product_variants 
    SET stock_quantity = new_stock, updated_at = now()
    WHERE id = p_variant_id;
  ELSE
    UPDATE public.products 
    SET stock_quantity = new_stock, updated_at = now()
    WHERE id = p_product_id;
  END IF;
  
  RETURN new_stock;
END;
$$;

-- 5. Create a function to validate and fix stock on insert/update
CREATE OR REPLACE FUNCTION public.validate_stock_quantity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure stock quantity is never negative
  IF NEW.stock_quantity < 0 THEN
    NEW.stock_quantity := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Add triggers to automatically fix negative stock
DROP TRIGGER IF EXISTS trg_products_validate_stock ON public.products;
CREATE TRIGGER trg_products_validate_stock
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_stock_quantity();

DROP TRIGGER IF EXISTS trg_variants_validate_stock ON public.product_variants;
CREATE TRIGGER trg_variants_validate_stock
  BEFORE INSERT OR UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_stock_quantity();
