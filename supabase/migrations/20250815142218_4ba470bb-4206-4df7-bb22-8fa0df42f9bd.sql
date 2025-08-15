-- Recalculate all customer statistics to only include paid orders
UPDATE public.customers 
SET 
  order_count = (
    SELECT COUNT(*) 
    FROM public.sales 
    WHERE customer_id = customers.id 
    AND payment_status = 'paid'
  ),
  total_spent = (
    SELECT COALESCE(SUM(grand_total), 0) 
    FROM public.sales 
    WHERE customer_id = customers.id 
    AND payment_status = 'paid'
  ),
  last_purchase_date = (
    SELECT MAX(created_at)
    FROM public.sales 
    WHERE customer_id = customers.id 
    AND payment_status = 'paid'
  ),
  updated_at = now();