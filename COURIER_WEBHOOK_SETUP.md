# Courier Webhook Setup for Real-Time Status Updates

This document explains how to set up the courier webhook system to receive real-time status updates from courier services.

## Overview

The system now supports real-time courier status updates through webhooks. When a courier service updates the status of a package, it sends a webhook to our endpoint, which automatically updates the sales table and notifies users in real-time.

## Components

### 1. Webhook Endpoint
- **URL**: `/functions/v1/courier-status-update`
- **Method**: POST
- **Purpose**: Receives status updates from courier services

### 2. Real-Time Updates
- **Technology**: Supabase Real-time subscriptions
- **Scope**: Sales table updates
- **UI Updates**: Automatic refresh of courier status display

### 3. Status Logging
- **Table**: `courier_status_logs`
- **Purpose**: Audit trail of all status changes
- **Data**: Complete webhook payload and status history

## Webhook Payload Format

Courier services should send POST requests with the following JSON structure:

```json
{
  "consignment_id": "ABC123456789",
  "status": "in_transit",
  "tracking_number": "TRK123456789",
  "estimated_delivery": "2024-01-15T10:00:00Z",
  "current_location": "Dhaka Hub",
  "notes": "Package picked up from warehouse",
  "courier_name": "John Doe",
  "courier_phone": "+8801234567890"
}
```

### Required Fields
- `consignment_id`: Unique identifier for the order (must match existing sales)
- `status`: Current delivery status

### Optional Fields
- `tracking_number`: Courier's internal tracking number
- `estimated_delivery`: Expected delivery date/time
- `current_location`: Current location of the package
- `notes`: Additional information from courier
- `delivery_date`: Actual delivery date (for delivered status)
- `return_reason`: Reason for return (for returned status)
- `courier_name`: Name of the courier handling delivery
- `courier_phone`: Contact number of the courier

## Supported Status Values

- `not_sent` - Order not yet sent to courier
- `sent` - Order sent to courier
- `in_transit` - Package in transit
- `out_for_delivery` - Out for final delivery
- `delivered` - Package delivered successfully
- `returned` - Package returned
- `lost` - Package lost

## Setup Instructions

### 1. Database Migration
Run the SQL migration to add new columns and tables:

```sql
-- Run the enhanced_courier_status_tracking.sql file
```

### 2. Deploy Edge Functions
Deploy the new edge function:

```bash
supabase functions deploy courier-status-update
```

### 3. Configure Courier Service
Configure your courier service to send webhooks to:

```
https://your-project.supabase.co/functions/v1/courier-status-update
```

### 4. Test the Webhook
Test with a sample payload:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/courier-status-update \
  -H "Content-Type: application/json" \
  -d '{
    "consignment_id": "TEST123",
    "status": "in_transit",
    "current_location": "Test Location",
    "notes": "Test webhook"
  }'
```

## Real-Time Features

### 1. Automatic UI Updates
- Status changes appear immediately without page refresh
- Toast notifications for status updates
- Real-time badge updates in sales table

### 2. Enhanced Status Display
- Detailed courier information
- Estimated delivery dates
- Current location tracking
- Courier contact details
- Status change history

### 3. Business Logic Integration
- Automatic payment status updates
- Delivery date tracking
- Return reason logging

## Security Considerations

### 1. Authentication
- The webhook endpoint is public (no authentication required)
- Implement IP whitelisting if needed
- Consider adding webhook signature verification

### 2. Data Validation
- All incoming data is validated
- Invalid payloads are rejected with appropriate error messages
- Database updates are wrapped in transactions

### 3. Rate Limiting
- Consider implementing rate limiting for webhook endpoints
- Monitor webhook usage and implement throttling if needed

## Monitoring and Debugging

### 1. Logs
- All webhook requests are logged
- Status changes are tracked in `courier_status_logs`
- Edge function logs are available in Supabase dashboard

### 2. Error Handling
- Failed webhooks return appropriate HTTP status codes
- Error messages include details for debugging
- Database errors are logged with context

### 3. Health Checks
- Monitor webhook endpoint availability
- Check database connection status
- Verify real-time subscription health

## Troubleshooting

### Common Issues

1. **Webhook Not Received**
   - Check courier service configuration
   - Verify endpoint URL
   - Check network connectivity

2. **Status Not Updated**
   - Verify consignment_id matches existing sales
   - Check webhook payload format
   - Review database permissions

3. **Real-Time Updates Not Working**
   - Check Supabase real-time configuration
   - Verify client subscription status
   - Check browser console for errors

### Debug Steps

1. Check edge function logs in Supabase dashboard
2. Verify webhook payload format
3. Test database queries manually
4. Check real-time subscription status
5. Review browser console for client-side errors

## Future Enhancements

### Planned Features
- Webhook signature verification
- Rate limiting and throttling
- Advanced status workflows
- Integration with multiple courier services
- Automated status escalation
- Customer notification system

### Customization Options
- Configurable status mappings
- Custom webhook payload formats
- Flexible business logic rules
- Multi-language support

## Support

For technical support or questions about the webhook system:

1. Check the logs in Supabase dashboard
2. Review this documentation
3. Test with sample payloads
4. Contact the development team

## Changelog

### Version 1.0.0
- Initial webhook endpoint implementation
- Real-time status updates
- Enhanced courier status tracking
- Status change audit logging
- Automatic payment status updates
