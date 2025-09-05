# Courier Webhook Fix Guide

## Issues Identified

The courier status check and "Send to Courier" functionality has the following issues:

1. **Database Configuration**: Webhook settings may not be properly configured
2. **Authentication**: Missing or incorrect Pathao access token
3. **Webhook URLs**: Incorrect or missing webhook URLs for order creation and status checking
4. **Status Check Logic**: Status updates not working due to authentication/configuration issues

## Step-by-Step Fix

### Step 1: Fix Database Configuration

Run the following SQL in your Supabase SQL Editor:

```sql
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
```

### Step 2: Get Your Pathao Access Token

1. Go to [Pathao Developer Portal](https://developer.pathao.com/)
2. Log in with your Pathao merchant account
3. Create a new app or use existing app
4. Get your access token from the app credentials
5. Update the `auth_username` field in the database with this token

### Step 3: Verify Webhook URLs

Ensure these URLs are correctly set:

- **Order Creation Webhook** (`webhook_url`): `https://n8n.pronirob.com/webhook/courier-orders`
- **Status Check Webhook** (`status_check_webhook_url`): `https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info`

### Step 4: Test the Fix

1. **Test Order Creation**:
   - Go to Sales page
   - Click "Send to Courier" on any sale
   - Verify the order is sent to your n8n workflow

2. **Test Status Check**:
   - After creating a courier order, wait a few minutes
   - Click the refresh button on the courier status
   - Verify the status updates from "PENDING" to actual status

3. **Test Auto-Refresh**:
   - The system automatically refreshes statuses every hour
   - Check if statuses are updating automatically

## How It Works

### Order Creation Flow
1. User clicks "Send to Courier"
2. Order data is sent to `webhook_url` (n8n workflow)
3. n8n workflow processes the order and creates courier order
4. Consignment ID is returned and stored in the sale record
5. Courier status is set to "PENDING"

### Status Check Flow
1. System uses `status_check_webhook_url` with Pathao API
2. Replaces `{consignment_id}` placeholder with actual ID
3. Sends GET request with Bearer token authentication
4. Parses Pathao API response for order status
5. Updates the sale record with new status
6. Auto-refreshes every hour for active orders

## Troubleshooting

### If Status Still Shows "PENDING"
1. Check if `auth_username` contains valid Pathao access token
2. Verify `status_check_webhook_url` is correct
3. Check browser console for API errors
4. Verify Pathao API credentials are valid

### If Orders Not Sending to Courier
1. Check if `webhook_url` points to correct n8n endpoint
2. Verify n8n workflow is active and receiving webhooks
3. Check if `is_active` is set to true in database

### If Database Errors
1. Run the SQL fix script again
2. Check if all required columns exist
3. Verify table permissions and policies

## Expected Result

After applying this fix:
- ✅ Orders can be sent to courier successfully
- ✅ Courier status updates dynamically from Pathao API
- ✅ Status changes from "PENDING" to actual delivery status
- ✅ Auto-refresh works every hour
- ✅ Manual refresh works for individual orders

## Files Modified

- `fix_courier_webhook_settings.sql` - Database fix script
- `fix_courier_webhook.ps1` - PowerShell helper script
- `COURIER_FIX_GUIDE.md` - This comprehensive guide

## Next Steps

1. Run the SQL fix script in Supabase
2. Update the Pathao access token
3. Test order creation and status checking
4. Verify auto-refresh functionality
5. Monitor for any remaining issues
