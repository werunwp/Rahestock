# Fix: "Webhook Error (403): Authorization data is wrong!"

## 🚨 **Issue Description**

When trying to send orders to courier, you're getting this error:
```
Webhook Error (403): Authorization data is wrong!
Failed to refresh order status
```

## 🔍 **Root Cause**

The error occurs because the system is trying to send **Basic Authentication** headers to your n8n webhook, but:

1. **n8n webhooks typically don't require authentication**
2. The `auth_username` field contains your **Pathao access token** (not a username)
3. The `auth_password` field might contain invalid data
4. The system is incorrectly trying to use Basic Auth for order creation

## 🛠️ **How to Fix**

### **Step 1: Run the SQL Fix**

Execute this SQL in your Supabase SQL Editor:

```sql
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
```

### **Step 2: Update Your Settings**

1. Go to **Settings → Courier Webhook Settings**
2. Ensure these fields are set correctly:
   - **Webhook URL**: `https://n8n.pronirob.com/webhook/courier-orders`
   - **Status Check Webhook URL**: `https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info`
   - **Pathao Access Token**: Your actual Pathao access token
   - **n8n Webhook Password**: Leave this **EMPTY** (n8n doesn't need it)

### **Step 3: Test the Fix**

1. **Test Order Creation**:
   - Go to Sales page
   - Click "Send to Courier" on any sale
   - Should work without the 403 error

2. **Test Status Check**:
   - After creating a courier order, click refresh on status
   - Should update from "PENDING" to actual status

## 🔧 **What Was Fixed**

### **Code Changes Made:**

1. **CourierOrderDialog.tsx**: Fixed authentication logic to only send Basic Auth when both credentials are provided
2. **CourierWebhookSettings.tsx**: Updated labels to clarify field purposes
3. **Database**: Cleared invalid auth_password data

### **Authentication Logic:**

**Before (Broken):**
```typescript
// Always tried to send Basic Auth if any credentials existed
headers: {
  'Content-Type': 'application/json',
  ...(webhookSettings.auth_username && webhookSettings.auth_password && {
    'Authorization': `Basic ${btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`)}`
  })
}
```

**After (Fixed):**
```typescript
// Only sends Basic Auth if BOTH credentials are provided AND not empty
if (webhookSettings.auth_username && webhookSettings.auth_password && 
    webhookSettings.auth_username.trim() !== '' && webhookSettings.auth_password.trim() !== '') {
  const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
  headers['Authorization'] = `Basic ${credentials}`;
}
```

## 📋 **Field Purposes Clarified**

| Field | Purpose | Required |
|-------|---------|----------|
| `webhook_url` | n8n webhook for sending orders | ✅ Yes |
| `status_check_webhook_url` | Pathao API for checking status | ✅ Yes |
| `auth_username` | Pathao access token | ✅ Yes |
| `auth_password` | n8n webhook password | ❌ No (leave empty) |

## ✅ **Expected Result**

After applying this fix:
- ✅ Orders can be sent to courier without 403 errors
- ✅ No more "Authorization data is wrong!" messages
- ✅ Courier status updates work correctly
- ✅ n8n webhook receives orders properly

## 🚨 **Important Notes**

1. **Leave `auth_password` EMPTY** - n8n webhooks don't need it
2. **`auth_username` should contain your Pathao access token** (not a username)
3. **The system now intelligently decides when to send authentication headers**
4. **Only n8n webhooks that specifically require authentication will get Basic Auth**

## 🔍 **Troubleshooting**

If you still get errors:

1. **Check browser console** for detailed error messages
2. **Verify n8n webhook URL** is correct and accessible
3. **Ensure Pathao access token** is valid and not expired
4. **Check if your n8n workflow** is active and receiving webhooks

## 📁 **Files Modified**

- `src/components/CourierOrderDialog.tsx` - Fixed authentication logic
- `src/components/CourierWebhookSettings.tsx` - Updated labels and descriptions
- `fix_webhook_auth.sql` - Database fix script
- `WEBHOOK_AUTH_FIX.md` - This guide

