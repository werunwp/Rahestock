# n8n Workflow Setup for Courier Integration

## 🎯 **Overview**

Your n8n workflow at `YOUR_N8N_URL_HERE/workflow/YOUR_WORKFLOW_ID` needs to handle two types of requests:

1. **Order Creation** - When "Send to Courier" is clicked
2. **Status Checking** - When "Refresh order status" is clicked

## 🔧 **How It Works Now**

### **Order Creation (Send to Courier)**
- **Method**: POST to your n8n webhook
- **Data**: Full order details (customer, products, address, etc.)
- **Action**: Your n8n workflow creates the order in Pathao
- **Response**: Success/failure message

### **Status Checking (Refresh Order Status)**
- **Method**: POST to your n8n webhook  
- **Data**: `{ action: "check_status", consignment_id: "...", sale_id: "..." }`
- **Action**: Your n8n workflow checks Pathao API and returns status
- **Response**: `{ status: "delivered" }` or similar

## 📋 **Required n8n Workflow Structure**

### **1. Webhook Trigger Node**
```
- Method: POST
- Path: /webhook/courier-orders
- Authentication: Basic (if you want password protection)
```

### **2. Switch Node (Route by Action)**
```
- Route 1: action === "check_status" → Status Check Branch
- Route 2: action !== "check_status" → Order Creation Branch
```

### **3. Order Creation Branch**
```
- HTTP Request Node: POST to Pathao API
- URL: https://api-hermes.pathao.com/aladdin/api/v1/orders
- Headers: Authorization: Bearer YOUR_PATHAO_TOKEN
- Body: Order data from webhook
- Response: Success/failure message
```

### **4. Status Check Branch**
```
- HTTP Request Node: GET from Pathao API
- URL: https://api-hermes.pathao.com/aladdin/api/v1/orders/{consignment_id}/info
- Headers: Authorization: Bearer YOUR_PATHAO_TOKEN
- Response: Order status data
- Transform: Extract status and return { status: "..." }
```

## 🚀 **Expected Request/Response Format**

### **Order Creation Request**
```json
{
  "customer_name": "Asif Khan Nirob",
  "customer_phone": "+8801234567890",
  "customer_address": "Arifabas housing, road 4, house 4, dhaka, miropur7",
  "products": [...],
  "total_amount": 90,
  "invoice_number": "INV000008"
}
```

### **Status Check Request**
```json
{
  "action": "check_status",
  "consignment_id": "DA230825YA7B2D",
  "sale_id": "uuid-here"
}
```

### **Status Check Response**
```json
{
  "status": "delivered"
}
```

## 🔑 **Pathao API Integration**

### **Get Your Pathao Access Token**
1. Go to [Pathao Developer Portal](https://developer.pathao.com/)
2. Log in with your merchant account
3. Create a new app or use existing app
4. Get your access token

### **Required Headers**
```
Authorization: Bearer YOUR_PATHAO_ACCESS_TOKEN
Content-Type: application/json
```

## 📝 **n8n Workflow Code Example**

### **Webhook Trigger Configuration**
```javascript
// In your webhook node
const body = $input.all()[0].json;

// Check if this is a status check request
if (body.action === 'check_status') {
  // Route to status check branch
  return { action: 'check_status', consignment_id: body.consignment_id, sale_id: body.sale_id };
} else {
  // Route to order creation branch
  return { action: 'create_order', order_data: body };
}
```

### **Status Check Branch**
```javascript
// HTTP Request to Pathao API
const consignmentId = $('Switch').item.json.consignment_id;
const url = `https://api-hermes.pathao.com/aladdin/api/v1/orders/${consignmentId}/info`;

// Response processing
const response = $input.all()[0].json;
let status = 'pending';

if (response.data && response.data.order_status) {
  status = response.data.order_status_slug || response.data.order_status;
}

return { status: status };
```

## ✅ **Testing Your Workflow**

### **Test Order Creation**
```bash
curl -X POST YOUR_N8N_URL_HERE/webhook/courier-orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "customer_phone": "+8801234567890",
    "customer_address": "Test Address, Dhaka",
    "total_amount": 100
  }'
```

### **Test Status Check**
```bash
curl -X POST YOUR_N8N_URL_HERE/webhook/courier-orders \
  -H "Content-Type: application/json" \
  -d '{
    "action": "check_status",
    "consignment_id": "TEST123",
    "sale_id": "test-sale-id"
  }'
```

## 🔍 **Troubleshooting**

### **Common Issues**
1. **"Failed to refresh order status"** - Check if n8n workflow is active
2. **Webhook not receiving requests** - Verify webhook URL in app settings
3. **Pathao API errors** - Check access token and API permissions
4. **Status not updating** - Verify response format from n8n

### **Debug Steps**
1. Check n8n workflow execution logs
2. Verify webhook URL in app settings
3. Test webhook endpoint directly
4. Check browser console for errors

## 🎯 **Expected Result**

After proper setup:
- ✅ Orders sent to courier successfully
- ✅ Status updates work through n8n
- ✅ "Refresh order status" buttons work
- ✅ Auto-refresh works every hour
- ✅ No more "Failed to refresh order status" errors

## 📁 **Files Modified**

- `src/components/CourierWebhookSettings.tsx` - Removed Pathao Access Token field
- `src/pages/Sales.tsx` - Updated status refresh to use n8n
- `src/hooks/useStatusAutoRefresh.tsx` - Updated auto-refresh to use n8n
- `src/hooks/useWebhookSettings.tsx` - Removed status_check_webhook_url field
- `fix_courier_status_check.sql` - Updated database schema

Your system now works purely through n8n workflow - no Pathao API tokens needed in the app! 🚀

