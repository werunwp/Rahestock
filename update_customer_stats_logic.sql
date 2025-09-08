-- Update customer statistics logic to match new requirements
-- Run this in your Supabase SQL editor at https://supabase.akhiyanbd.com/project/default/sql/new?skip=true

-- Update the customer stats function with new logic:
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
        -- Delivered: Paid orders count (only payment_status = 'paid')
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
        -- Total Spent: Paid orders total (only payment_status = 'paid')
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

-- Add new columns if they don't exist
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_count INTEGER DEFAULT 0;

-- Update all existing customer statistics to match the new logic
UPDATE public.customers 
SET 
    -- Orders: Total orders count (all orders)
    order_count = (
        SELECT COUNT(*) 
        FROM public.sales 
        WHERE customer_id = customers.id
    ),
    -- Delivered: Paid orders count (only payment_status = 'paid')
    delivered_count = (
        SELECT COUNT(*) 
        FROM public.sales 
        WHERE customer_id = customers.id 
        AND payment_status = 'paid'
    ),
    -- Cancelled: Cancelled orders count
    cancelled_count = (
        SELECT COUNT(*) 
        FROM public.sales 
        WHERE customer_id = customers.id 
        AND payment_status = 'cancelled'
    ),
    -- Total Spent: Paid orders total (only payment_status = 'paid')
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
