-- Add status_check_webhook_url field to courier_webhook_settings table
-- This field will be used specifically for checking order status from Pathao API

ALTER TABLE courier_webhook_settings
ADD COLUMN IF NOT EXISTS status_check_webhook_url TEXT;

COMMENT ON COLUMN courier_webhook_settings.status_check_webhook_url IS 'Separate webhook URL for checking courier status updates (GET requests to Pathao API)';

-- Update existing records to set a default status check URL
UPDATE courier_webhook_settings
SET status_check_webhook_url = 'https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info'
WHERE status_check_webhook_url IS NULL;

-- Make the field NOT NULL after setting default values
ALTER TABLE courier_webhook_settings
ALTER COLUMN status_check_webhook_url SET NOT NULL;


