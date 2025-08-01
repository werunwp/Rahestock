-- Function to update customer statistics
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
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
    
    -- Update customer statistics
    UPDATE public.customers 
    SET 
        order_count = (
            SELECT COUNT(*) 
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        total_spent = (
            SELECT COALESCE(SUM(grand_total), 0) 
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        last_purchase_date = (
            SELECT MAX(created_at)
            FROM public.sales 
            WHERE customer_id = customer_uuid
        ),
        updated_at = now()
    WHERE id = customer_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sales table
DROP TRIGGER IF EXISTS update_customer_stats_on_insert ON public.sales;
DROP TRIGGER IF EXISTS update_customer_stats_on_update ON public.sales;
DROP TRIGGER IF EXISTS update_customer_stats_on_delete ON public.sales;

CREATE TRIGGER update_customer_stats_on_insert
    AFTER INSERT ON public.sales
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

CREATE TRIGGER update_customer_stats_on_update
    AFTER UPDATE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

CREATE TRIGGER update_customer_stats_on_delete
    AFTER DELETE ON public.sales
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Enable realtime for customers table
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;