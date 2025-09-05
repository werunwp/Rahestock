-- Fix courier webhook settings table and ensure proper configuration
-- This script will fix the courier status check and send to courier functionality

-- First, let's check the current data
SELECT * FROM courier_webhook_settings;

-- Update the status_check_webhook_url to use the correct Pathao API endpoint
UPDATE courier_webhook_settings 
SET status_check_webhook_url = 'https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info'
WHERE status_check_webhook_url IS NULL OR status_check_webhook_url = '';

-- Ensure the webhook_url is set for order creation (this should be your n8n webhook)
-- Update this with your actual n8n webhook URL
UPDATE courier_webhook_settings 
SET webhook_url = 'https://n8n.pronirob.com/webhook/courier-orders'
WHERE webhook_url IS NULL OR webhook_url = '';

-- Set proper descriptions
UPDATE courier_webhook_settings 
SET webhook_description = 'Webhook for sending orders to courier (n8n workflow)',
    webhook_name = 'Courier Order Webhook'
WHERE webhook_description IS NULL OR webhook_description = '';

-- Ensure auth_username contains the Pathao access token
-- This field should store the access token for API calls
UPDATE courier_webhook_settings 
SET auth_username = 'YOUR_PATHAO_ACCESS_TOKEN_HERE'
WHERE auth_username IS NULL OR auth_username = '';

-- Set is_active to true
UPDATE courier_webhook_settings 
SET is_active = true
WHERE is_active IS NULL;

-- Insert default settings if no records exist
INSERT INTO courier_webhook_settings (
    id,
    webhook_url,
    webhook_name,
    webhook_description,
    status_check_webhook_url,
    is_active,
    auth_username,
    auth_password,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'https://n8n.pronirob.com/webhook/courier-orders',
    'Courier Order Webhook',
    'Webhook for sending orders to courier (n8n workflow)',
    'https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info',
    true,
    'YOUR_PATHAO_ACCESS_TOKEN_HERE',
    '',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM courier_webhook_settings);

-- Verify the final configuration
SELECT 
    id,
    webhook_url,
    webhook_name,
    webhook_description,
    status_check_webhook_url,
    is_active,
    auth_username,
    created_at,
    updated_at
FROM courier_webhook_settings;
