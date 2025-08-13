-- 1) Add has_variants to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

-- 2) Create product_attributes
CREATE TABLE IF NOT EXISTS public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON public.product_attributes(product_id);

-- 3) Create product_attribute_values
CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attribute_id ON public.product_attribute_values(attribute_id);

-- 4) Create product_variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attributes jsonb NOT NULL,
  sku text UNIQUE,
  rate numeric,
  cost numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_unique_product_attributes ON public.product_variants (product_id, attributes);

-- 5) Enable RLS and policies
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage product attributes"
ON public.product_attributes
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage product attribute values"
ON public.product_attribute_values
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage product variants"
ON public.product_variants
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 6) Add variant_id to sales_items & inventory_logs
ALTER TABLE public.sales_items
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id);
CREATE INDEX IF NOT EXISTS idx_sales_items_variant_id ON public.sales_items(variant_id);

ALTER TABLE public.inventory_logs
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON public.inventory_logs(variant_id);

-- 7) Trigger to recalc parent product stock when variants change
CREATE OR REPLACE FUNCTION public.recalc_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p_id uuid;
  total_stock integer;
BEGIN
  p_id := COALESCE(NEW.product_id, OLD.product_id);
  IF p_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(stock_quantity), 0)
  INTO total_stock
  FROM public.product_variants
  WHERE product_id = p_id;

  UPDATE public.products
  SET stock_quantity = total_stock,
      updated_at = now()
  WHERE id = p_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_product_variants_recalc_stock_aiud ON public.product_variants;
CREATE TRIGGER trg_product_variants_recalc_stock_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.recalc_product_stock();

-- 8) Keep updated_at fresh on product_variants
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();