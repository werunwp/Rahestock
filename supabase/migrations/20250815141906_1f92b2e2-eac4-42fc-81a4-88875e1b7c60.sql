-- Update the customer stats function to only include paid orders
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update customer statistics based on paid sales only
  UPDATE customers 
  SET 
    order_count = (
      SELECT COUNT(*) 
      FROM sales 
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) 
      AND payment_status = 'paid'
    ),
    total_spent = (
      SELECT COALESCE(SUM(grand_total), 0) 
      FROM sales 
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) 
      AND payment_status = 'paid'
    ),
    last_purchase_date = (
      SELECT MAX(created_at) 
      FROM sales 
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) 
      AND payment_status = 'paid'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;