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

        // Get webhook settings
        const { data: webhookSettings } = await supabase
          .from('courier_webhook_settings')
          .select('webhook_url')
          .eq('is_active', true)
          .maybeSingle();

        if (!webhookSettings?.webhook_url) return;

        // Refresh status for each sale
        for (const sale of salesWithTracking) {
          try {
            const statusCheckUrl = `${webhookSettings.webhook_url}?consignment_id=${sale.consignment_id}`;
            const response = await fetch(statusCheckUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const result = await response.json();
              const newCourierStatus = result.status || result.order_status || 'pending';
              
              // Map courier status to payment status
              let paymentStatusUpdate = {};
              if (newCourierStatus === 'delivered') {
                paymentStatusUpdate = { payment_status: 'paid' };
              } else if (newCourierStatus === 'returned' || newCourierStatus === 'lost') {
                paymentStatusUpdate = { payment_status: 'cancelled' };
              }
              
              // Update the sale in database
              await supabase
                .from('sales')
                .update({ 
                  courier_status: newCourierStatus,
                  order_status: newCourierStatus,
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