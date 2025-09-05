-- Fix courier status check functionality for n8n workflow
-- This script will resolve the "Failed to refresh order status" error

-- First, check current configuration
SELECT 
    id,
    webhook_url,
    webhook_name,
    webhook_description,
    is_active,
    auth_password,
    created_at
FROM courier_webhook_settings;

-- Clear any invalid auth_password data
UPDATE courier_webhook_settings 
SET auth_password = ''
WHERE auth_password IS NOT NULL AND auth_password != '';

-- Ensure webhook_url is set correctly for n8n
UPDATE courier_webhook_settings 
SET webhook_url = 'https://n8n.pronirob.com/webhook/courier-orders'
WHERE webhook_url IS NULL OR webhook_url = '';

-- Set proper descriptions
UPDATE courier_webhook_settings 
SET webhook_description = 'n8n webhook that handles both order creation and status checking',
    webhook_name = 'Courier n8n Webhook'
WHERE webhook_description IS NULL OR webhook_description = '';

-- Ensure is_active is true
UPDATE courier_webhook_settings 
SET is_active = true
WHERE is_active IS NULL;

-- Insert default settings if no records exist
INSERT INTO courier_webhook_settings (
    id,
    webhook_url,
    webhook_name,
    webhook_description,
    is_active,
    auth_password,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'https://n8n.pronirob.com/webhook/courier-orders',
    'Courier n8n Webhook',
    'n8n webhook that handles both order creation and status checking',
    true,
    '', -- Leave empty for user to fill in if needed
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM courier_webhook_settings);

-- Verify the final configuration
SELECT 
    id,
    webhook_url,
    webhook_name,
    webhook_description,
    is_active,
    auth_password,
    created_at,
    updated_at
FROM courier_webhook_settings;
