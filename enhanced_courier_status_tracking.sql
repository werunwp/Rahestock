-- Enhanced Courier Status Tracking Migration
-- This migration adds new columns to support real-time courier status updates

-- Add new columns to sales table for enhanced courier tracking
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_location TEXT,
ADD COLUMN IF NOT EXISTS courier_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_reason TEXT,
ADD COLUMN IF NOT EXISTS courier_name TEXT,
ADD COLUMN IF NOT EXISTS courier_phone TEXT;

-- Create courier_status_logs table for audit trail
CREATE TABLE IF NOT EXISTS courier_status_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  consignment_id TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  courier_notes TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  webhook_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_courier_status_logs_sale_id ON courier_status_logs(sale_id);
CREATE INDEX IF NOT EXISTS idx_courier_status_logs_consignment_id ON courier_status_logs(consignment_id);
CREATE INDEX IF NOT EXISTS idx_courier_status_logs_timestamp ON courier_status_logs(timestamp);

-- Enable Row Level Security on the new table
ALTER TABLE courier_status_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for courier_status_logs
CREATE POLICY "Users can view courier status logs for their sales" ON courier_status_logs
  FOR SELECT USING (
    sale_id IN (
      SELECT id FROM sales WHERE id = courier_status_logs.sale_id
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN sales.tracking_number IS 'Courier tracking number for the order';
COMMENT ON COLUMN sales.estimated_delivery IS 'Estimated delivery date from courier';
COMMENT ON COLUMN sales.current_location IS 'Current location of the package';
COMMENT ON COLUMN sales.courier_notes IS 'Notes from courier service';
COMMENT ON COLUMN sales.delivery_date IS 'Actual delivery date when package is delivered';
COMMENT ON COLUMN sales.return_reason IS 'Reason for return if package is returned';
COMMENT ON COLUMN sales.courier_name IS 'Name of the courier handling the delivery';
COMMENT ON COLUMN sales.courier_phone IS 'Phone number of the courier';

COMMENT ON TABLE courier_status_logs IS 'Audit trail for all courier status changes';
COMMENT ON COLUMN courier_status_logs.webhook_data IS 'Raw webhook data received from courier service';

-- Update existing sales to have default values for new columns
UPDATE sales 
SET 
  tracking_number = COALESCE(tracking_number, ''),
  courier_notes = COALESCE(courier_notes, ''),
  return_reason = COALESCE(return_reason, '')
WHERE 
  tracking_number IS NULL 
  OR courier_notes IS NULL 
  OR return_reason IS NULL;

-- Create a function to automatically update last_status_check when courier_status changes
CREATE OR REPLACE FUNCTION update_last_status_check()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.courier_status IS DISTINCT FROM OLD.courier_status THEN
    NEW.last_status_check = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_status_check
DROP TRIGGER IF EXISTS trigger_update_last_status_check ON sales;
CREATE TRIGGER trigger_update_last_status_check
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_last_status_check();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON courier_status_logs TO authenticated;
GRANT USAGE ON SEQUENCE courier_status_logs_id_seq TO authenticated;

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO courier_status_logs (sale_id, consignment_id, old_status, new_status, courier_notes)
-- SELECT 
--   id, 
--   consignment_id, 
--   'pending', 
--   courier_status, 
--   'Initial status from migration'
-- FROM sales 
-- WHERE consignment_id IS NOT NULL AND courier_status IS NOT NULL;
