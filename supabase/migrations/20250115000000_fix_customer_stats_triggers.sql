-- Fix customer statistics triggers to automatically update on sales changes
-- This migration ensures customer statistics are updated automatically when sales are added, updated, or deleted

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_customer_stats_on_insert ON public.sales;
DROP TRIGGER IF EXISTS update_customer_stats_on_update ON public.sales;
DROP TRIGGER IF EXISTS update_customer_stats_on_delete ON public.sales;

-- Create or replace the update_customer_stats function with improved logic
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
    
    -- Update customer statistics with new logic:
    -- Orders: Total orders count (all orders)
    -- Delivered: Paid orders count 
    -- Cancelled: Cancelled orders count
    -- Total Spent: Paid orders total
    UPDATE public.customers 
    SET 
        -- Orders: Total orders count (all orders)
        order_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        delivered_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND (
                payment_status = 'paid' 
                OR (amount_paid > 0 AND amount_paid >= grand_total)
            )
        ),
        cancelled_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND payment_status = 'cancelled'
        ),
        total_spent = (
            SELECT COALESCE(SUM(grand_total), 0) 
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND (
                payment_status = 'paid' 
                OR (amount_paid > 0 AND amount_paid >= grand_total)
            )
        ),
        last_purchase_date = (
            SELECT MAX(created_at)
            FROM public.sales 
            WHERE customer_id = customer_uuid 
            AND (
                payment_status = 'paid' 
                OR (amount_paid > 0 AND amount_paid >= grand_total)
            )
        ),
        updated_at = now()
    WHERE id = customer_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate triggers for sales table
CREATE TRIGGER update_customer_stats_on_insert
    AFTER INSERT ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

CREATE TRIGGER update_customer_stats_on_update
    AFTER UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

CREATE TRIGGER update_customer_stats_on_delete
    AFTER DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION public.update_customer_stats();

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
    delivered_count = (
        SELECT COUNT(*) 
        FROM public.sales 
        WHERE customer_id = customers.id 
        AND (
            payment_status = 'paid' 
            OR (amount_paid > 0 AND amount_paid >= grand_total)
        )
    ),
    cancelled_count = (
        SELECT COUNT(*) 
        FROM public.sales 
        WHERE customer_id = customers.id 
        AND payment_status = 'cancelled'
    ),
    total_spent = (
        SELECT COALESCE(SUM(grand_total), 0) 
        FROM public.sales 
        WHERE customer_id = customers.id 
        AND (
            payment_status = 'paid' 
            OR (amount_paid > 0 AND amount_paid >= grand_total)
        )
    ),
    last_purchase_date = (
        SELECT MAX(created_at)
        FROM public.sales 
        WHERE customer_id = customers.id 
        AND (
            payment_status = 'paid' 
            OR (amount_paid > 0 AND amount_paid >= grand_total)
        )
    ),
    updated_at = now();
