-- Fix webhook authentication configuration
-- This script will resolve the "Authorization data is wrong!" error

-- First, check current configuration
SELECT 
    id,
    webhook_url,
    webhook_name,
    status_check_webhook_url,
    is_active,
    auth_username,
    auth_password,
    created_at
FROM courier_webhook_settings;

-- Clear the auth_password field since n8n webhooks typically don't need it
-- This will prevent the "Authorization data is wrong!" error
UPDATE courier_webhook_settings 
SET auth_password = ''
WHERE auth_password IS NOT NULL AND auth_password != '';

-- Ensure webhook_url is set correctly for n8n
UPDATE courier_webhook_settings 
SET webhook_url = 'https://n8n.pronirob.com/webhook/courier-orders'
WHERE webhook_url IS NULL OR webhook_url = '';

-- Ensure status_check_webhook_url is set correctly for Pathao API
UPDATE courier_webhook_settings 
SET status_check_webhook_url = 'https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info'
WHERE status_check_webhook_url IS NULL OR status_check_webhook_url = '';

-- Set proper descriptions
UPDATE courier_webhook_settings 
SET webhook_description = 'Webhook for sending orders to courier (n8n workflow)',
    webhook_name = 'Courier Order Webhook'
WHERE webhook_description IS NULL OR webhook_description = '';

-- Ensure is_active is true
UPDATE courier_webhook_settings 
SET is_active = true
WHERE is_active IS NULL;

-- Verify the final configuration
SELECT 
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
FROM courier_webhook_settings;

