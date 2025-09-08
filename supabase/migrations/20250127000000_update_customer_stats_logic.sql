-- Update the customer stats function to match new requirements:
-- Orders: Total orders count (all orders)
-- Delivered: Paid orders count 
-- Cancelled: Cancelled orders count
-- Total Spent: Paid orders total

CREATE OR REPLACE FUNCTION public.update_customer_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    customer_uuid UUID;
BEGIN
    -- Get customer_id from the affected row
    IF TG_OP = 'DELETE' THEN
        customer_uuid := OLD.customer_id;
    ELSE
        customer_uuid := NEW.customer_id;
    END IF;
    
    -- Skip if no customer_id
    IF customer_uuid IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Update customer statistics with new logic
    UPDATE public.customers 
    SET 
        -- Orders: Total orders count (all orders)
        order_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        -- Delivered: Paid orders count
        delivered_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND payment_status = 'paid'
        ),
        -- Cancelled: Cancelled orders count
        cancelled_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND payment_status = 'cancelled'
        ),
        -- Total Spent: Paid orders total
        total_spent = (
            SELECT COALESCE(SUM(grand_total), 0) 
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND payment_status = 'paid'
        ),
        last_purchase_date = (
            SELECT MAX(created_at)
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND payment_status = 'paid'
        ),
        updated_at = now()
    WHERE id = customer_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;
