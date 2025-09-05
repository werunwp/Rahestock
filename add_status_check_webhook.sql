-- Add status check webhook URL to courier_webhook_settings table
-- This allows separate URLs for sending orders vs checking status

ALTER TABLE courier_webhook_settings 
ADD COLUMN IF NOT EXISTS status_check_webhook_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN courier_webhook_settings.status_check_webhook_url IS 'Separate webhook URL for checking courier status updates (GET requests)';

-- Update existing records to have the same URL for both (backward compatibility)
UPDATE courier_webhook_settings 
SET status_check_webhook_url = webhook_url 
WHERE status_check_webhook_url IS NULL;

-- Make the field not null after setting default values
ALTER TABLE courier_webhook_settings 
ALTER COLUMN status_check_webhook_url SET NOT NULL;
