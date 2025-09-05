import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStatusAutoRefresh = () => {
  const queryClient = useQueryClient();

  // Auto refresh courier status every hour
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Get all sales with consignment IDs
        const { data: salesWithTracking } = await supabase
          .from('sales')
          .select('id, consignment_id')
          .not('consignment_id', 'is', null)
          .neq('courier_status', 'delivered')
          .neq('courier_status', 'returned')
          .neq('courier_status', 'lost');

        if (!salesWithTracking || salesWithTracking.length === 0) return;

        // Get webhook settings for status check (using same pattern as useWebhookSettings)
        const { data: webhookData } = await supabase
        .from('courier_webhook_settings')
        .select('*')
        .limit(1);
        
        const webhookSettings = webhookData?.[0];

        if (!webhookSettings?.status_check_webhook_url) return;

        // Refresh status for each sale
        for (const sale of salesWithTracking) {
          try {
            // Call n8n webhook for status check
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            
            // Add Basic Auth if credentials are configured
            if (webhookSettings.auth_username && webhookSettings.auth_password &&
                webhookSettings.auth_username.trim() !== '' && webhookSettings.auth_password.trim() !== '') {
              const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
              headers['Authorization'] = `Basic ${credentials}`;
            }

            const response = await fetch(webhookSettings.status_check_webhook_url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                type: 'status_check',
                action: 'check_status',
                consignment_id: sale.consignment_id,
                sale_id: sale.id
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('Status check response:', result);
              
              // Handle the specific response format from your webhook
              let newCourierStatus = 'pending';
              
              if (Array.isArray(result) && result.length > 0) {
                // Format: [{ "type": "success", "code": 200, "data": { "order_status": "..." } }]
                const firstResponse = result[0];
                if (firstResponse.type === 'success' && firstResponse.data) {
                  newCourierStatus = firstResponse.data.order_status || 'pending';
                }
              } else if (result.data && result.data.order_status) {
                // Fallback format: { "data": { "order_status": "..." } }
                newCourierStatus = result.data.order_status;
              } else if (result.order_status) {
                // Direct format: { "order_status": "..." }
                newCourierStatus = result.order_status;
              } else if (result.status) {
                // Legacy format: { "status": "..." }
                newCourierStatus = result.status;
              } else if (result.courier_status) {
                // Legacy format: { "courier_status": "..." }
                newCourierStatus = result.courier_status;
              }
              
              console.log('Extracted courier status:', newCourierStatus);
              
              // Normalize status for consistent display
              const normalizedStatus = newCourierStatus.toLowerCase().replace(/[^a-z0-9]/g, '_');
              let displayStatus = newCourierStatus;
              
              if (normalizedStatus.includes('pickup_cancelled') || normalizedStatus.includes('pickup_cancel') || normalizedStatus.includes('cancelled')) {
                displayStatus = 'cancelled';
              } else if (normalizedStatus.includes('in_transit') || normalizedStatus.includes('picked_up')) {
                displayStatus = 'in_transit';
              } else if (normalizedStatus.includes('out_for_delivery')) {
                displayStatus = 'out_for_delivery';
              } else if (normalizedStatus.includes('delivered') || normalizedStatus.includes('completed')) {
                displayStatus = 'delivered';
              } else if (normalizedStatus.includes('returned')) {
                displayStatus = 'returned';
              }
              
              console.log('Normalized display status:', displayStatus);
              
              // Map courier status to payment status
              let paymentStatusUpdate = {};
              if (normalizedStatus.includes('delivered') || normalizedStatus.includes('completed')) {
                paymentStatusUpdate = { payment_status: 'paid' };
                console.log('Auto-refresh: Setting payment status to: paid');
              } else if (normalizedStatus.includes('returned') || normalizedStatus.includes('lost') || 
                         normalizedStatus.includes('cancelled') || normalizedStatus.includes('pickup_cancelled') || 
                         normalizedStatus.includes('pickup_cancel')) {
                paymentStatusUpdate = { payment_status: 'cancelled' };
                console.log('Auto-refresh: Setting payment status to: cancelled');
              } else {
                console.log('Auto-refresh: No payment status update needed for status:', normalizedStatus);
              }
              
              console.log('Auto-refresh: Payment status update object:', paymentStatusUpdate);
              
              // Update the sale in database
              await supabase
                .from('sales')
                .update({ 
                  courier_status: displayStatus,
                  order_status: displayStatus,
                  last_status_check: new Date().toISOString(),
                  ...paymentStatusUpdate
                })
                .eq('id', sale.id);
            }
          } catch (error) {
            console.error(`Failed to refresh status for sale ${sale.id}:`, error);
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Refresh sales data in UI
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        
        console.log(`Auto-refreshed ${salesWithTracking.length} order statuses`);
      } catch (error) {
        console.error('Error in auto-refresh:', error);
      }
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
};